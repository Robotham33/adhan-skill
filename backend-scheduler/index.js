import { DateTime } from 'luxon';
import fetch from 'node-fetch';
import AWS from 'aws-sdk';
import { PrayerTimes, Coordinates, CalculationMethod } from 'adhan';

const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.TABLE || 'AdhanUsers';
const TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const TRIGGER_STAGE = process.env.TRIGGER_STAGE || 'development'; // 'development' ou 'production'
const TRIGGER_URL = `https://api.amazonalexa.com/v1/routines/triggerInstances/stages/${TRIGGER_STAGE}`;
const TRIGGER_NAME = process.env.TRIGGER_NAME || 'AdhanTime';
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Fonction utilitaire pour récupérer un paramètre SSM
async function getSSMParameter(name, withDecryption = true) {
  const ssm = new AWS.SSM();
  const res = await ssm.getParameter({ Name: name, WithDecryption: withDecryption }).promise();
  return res.Parameter.Value;
}
const WINDOW_SEC = 60; // tolérance +/-60s

async function getAccessToken() {
  // Récupérer les credentials depuis Parameter Store
  const clientId = await getSSMParameter('/adhan-skill/client_id');
  const clientSecret = await getSSMParameter('/adhan-skill/client_secret');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'alexa::routines:triggerinstances:write'
    })
  });
  if (!res.ok) throw new Error(`Token error ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

function isDueNow(nowUtc, times, tz) {
  for (const t of times) {
    const local = DateTime.fromISO(t, { zone: tz }); // ex "2025-08-28T04:56:00"
    if (!local.isValid) continue;
    const diff = Math.abs(local.toUTC().toSeconds() - nowUtc.toSeconds());
    if (diff <= WINDOW_SEC) return true;
  }
  return false;
}

async function postTrigger(accessToken, userId) {
  // Ajout d'un paramètre audioUrl dans le trigger
  const audioUrl = arguments[2] || '';
  const payload = {
    requestId: `req-${Date.now()}`,
    delivery: 'UNICAST',
    trigger: { name: TRIGGER_NAME, parameters: { audioUrl } },
    recipients: [ { type: 'USER', value: { id: userId } } ]
  };
  const res = await fetch(TRIGGER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  if (res.status !== 202) throw new Error(`Trigger failed ${res.status}: ${text}`);
  console.log('Trigger OK 202', text);
}

async function loadActiveUsers() {
  const res = await ddb.scan({
    TableName: TABLE,
    FilterExpression: "#en = :true",
    ExpressionAttributeNames: { "#en": "enabled" },
    ExpressionAttributeValues: { ":true": true }
  }).promise();
  return res.Items || [];
}

function computeTodayTimes(user) {
  // Utilisation de l'API Aladhan pour calculer les horaires
  const tz = user.timezone;
  const nowLocal = DateTime.now().setZone(tz);
  const dateStr = nowLocal.toFormat('dd-MM-yyyy');
  const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${user.lat}&longitude=${user.lon}&method=2&timezonestring=${tz}`;
  return fetch(url)
    .then(res => res.json())
    .then(json => {
      const t = json.data.timings;
      return [t.Fajr, t.Dhuhr, t.Asr, t.Maghrib, t.Isha];
    });
}

// 🔔 Handler “minute” : déclenche au moment T
export const handler = async () => {
  const nowUtc = DateTime.utc();
  let accessToken, users;
  try {
    accessToken = await getAccessToken();
  } catch (err) {
    console.error('Erreur getAccessToken:', err);
    return;
  }
  try {
    users = await loadActiveUsers();
  } catch (err) {
    console.error('Erreur loadActiveUsers:', err);
    return;
  }

  await Promise.all(users.map(async (u) => {
    try {
      if (!u.todayTimes || !u.timezone || !u.userId) return;
      // todayTimes contient les horaires du jour (fajr, dhuhr, asr, maghrib, isha)
      // On vérifie si l'un des horaires correspond à l'heure actuelle
      if (isDueNow(nowUtc, u.todayTimes, u.timezone)) {
        const isPremium = !!u.premium;
        // Choix de l'URL audio selon le statut premium
        const audioUrl = isPremium
          ? process.env.ADHAN_AUDIO_URL_FULL || 'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-full.mp3'
          : process.env.ADHAN_AUDIO_URL_SHORT || 'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-short.mp3';
        // Passer l'URL audio dans le trigger
        await postTrigger(accessToken, u.userId, audioUrl);
        console.log(`Routine déclenchée pour userId=${u.userId} (premium=${isPremium}) avec audio=${audioUrl}`);
      }
    } catch (err) {
      console.error(`Erreur postTrigger pour userId=${u.userId}:`, err);
    }
  }));
}

// 🌙 Handler “nightly” : rempli todayTimes à ~00:05 local
exports.nightlyHandler = async () => {
  const users = await loadActiveUsers();
  for (const u of users) {
    if (!u.enabled || !u.timezone || u.lat == null || u.lon == null) continue;
    const nowLocal = DateTime.now().setZone(u.timezone);
    // Ne recalcule que quand il est ~00:05 local (±30 min)
    const isAroundMidnight = nowLocal.hour === 0 && nowLocal.minute >= 0 && nowLocal.minute <= 35;
    if (!isAroundMidnight) continue;

    try {
      // Récupère les horaires du jour via l'API Aladhan
      const dateStr = nowLocal.toFormat('dd-MM-yyyy');
      const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${u.lat}&longitude=${u.lon}&method=2&timezonestring=${u.timezone}`;
      const response = await fetch(url);
      const json = await response.json();
      const t = json.data.timings;
      // Stocke les horaires dans l'ordre [Fajr, Dhuhr, Asr, Maghrib, Isha]
      const timesLocal = [t.Fajr, t.Dhuhr, t.Asr, t.Maghrib, t.Isha];
      await ddb.update({
        TableName: TABLE,
        Key: { userId: u.userId },
        UpdateExpression: "SET todayTimes = :t",
        ExpressionAttributeValues: { ":t": timesLocal }
      }).promise();
      console.log('todayTimes updated for', u.userId, timesLocal);
    } catch (err) {
      console.error('Erreur calcul horaires Aladhan pour', u.userId, err);
    }
  }
}

// Fonction de test pour simuler le déclenchement d'une prière
exports.testTriggerForPrayer = async (userId, prayerName = 'Maghrib') => {
  const user = await ddb.get({ TableName: TABLE, Key: { userId } }).promise().then(r => r.Item);
  if (!user || !user.todayTimes || !user.timezone) {
    console.error('Utilisateur ou horaires non trouvés');
    return;
  }
  const isPremium = !!user.premium;
  const audioUrl = isPremium
    ? process.env.ADHAN_AUDIO_URL_FULL || 'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-full.mp3'
    : process.env.ADHAN_AUDIO_URL_SHORT || 'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-short.mp3';
  const accessToken = await getAccessToken();
  // Index des prières : [Fajr, Dhuhr, Asr, Maghrib, Isha]
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const idx = prayers.indexOf(prayerName);
  if (idx === -1) {
    console.error('Nom de prière invalide');
    return;
  }
  // Simule le déclenchement à l’horaire de la prière choisie
  await postTrigger(accessToken, userId, audioUrl);
  console.log(`Test routine déclenchée pour ${prayerName} (premium=${isPremium}) avec audio=${audioUrl}`);
}

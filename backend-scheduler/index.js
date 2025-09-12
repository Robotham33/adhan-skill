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
const WINDOW_SEC = 60; // tolérance +/-60s

async function getAccessToken() {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
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
  const payload = {
    requestId: `req-${Date.now()}`,
    delivery: 'UNICAST',
    trigger: { name: TRIGGER_NAME, parameters: {} },
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
  const tz = user.timezone;
  const nowLocal = DateTime.now().setZone(tz);
  const date = new Date(nowLocal.year, nowLocal.month - 1, nowLocal.day);
  const coords = new Coordinates(user.lat, user.lon);
  const params = CalculationMethod.MuslimWorldLeague(); // ajuste méthode/madhhab si besoin

  const pt = new PrayerTimes(coords, date, params);
  const fmt = (d) => DateTime.fromJSDate(d, { zone: tz }).toISO({ suppressMilliseconds: true });
  return [fmt(pt.fajr), fmt(pt.dhuhr), fmt(pt.asr), fmt(pt.maghrib), fmt(pt.isha)];
}

// 🔔 Handler “minute” : déclenche au moment T
export const handler = async () => {
  const nowUtc = DateTime.utc();
  const accessToken = await getAccessToken();
  const users = await loadActiveUsers();

  for (const u of users) {
    if (!u.todayTimes || !u.timezone || !u.userId) continue;
    if (isDueNow(nowUtc, u.todayTimes, u.timezone)) {
      await postTrigger(accessToken, u.userId);
    }
  }
};

// 🌙 Handler “nightly” : rempli todayTimes à ~00:05 local
export const nightlyHandler = async () => {
  const users = await loadActiveUsers();
  for (const u of users) {
    if (!u.enabled || !u.timezone || u.lat == null || u.lon == null) continue;
    const nowLocal = DateTime.now().setZone(u.timezone);
    // Ne recalcule que quand il est ~00:05 local (±30 min)
    const isAroundMidnight = nowLocal.hour === 0 && nowLocal.minute >= 0 && nowLocal.minute <= 35;
    if (!isAroundMidnight) continue;

    const timesLocalIso = computeTodayTimes(u);
    await ddb.update({
      TableName: TABLE,
      Key: { userId: u.userId },
      UpdateExpression: "SET todayTimes = :t",
      ExpressionAttributeValues: { ":t": timesLocalIso }
    }).promise();
    console.log('todayTimes updated for', u.userId, timesLocalIso);
  }
};

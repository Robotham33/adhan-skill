import * as Alexa from 'ask-sdk-core';
import { t } from '../i18n/index.js';
import { getUserSettings, saveConsent } from '../services/userRepo.js';
import { buyMonthlyDirective, buyYearlyDirective, isPremium } from '../services/monetization.js';
import { resolveLocationAndMethod } from '../services/deviceLocation.js';
import { computePrayerTimes } from '../services/prayerTimes.js';
import { bumpCityStat } from '../services/stats.js';
import { saveConsent } from '../services/userRepo.js';

const SESSION = {
  ASK_TRIAL: 'ASK_TRIAL',
  ASK_TRIAL_CHOICE: 'ASK_TRIAL_CHOICE',
  ASK_SCHEDULING: 'ASK_SCHEDULING'
};
const PERMISSIONS = [
  'read::alexa:device:all:address',
  'alexa::devices:all:settings:read'
];

export const OnboardingLaunchHandler = {
  canHandle(h){ return Alexa.getRequestType(h.requestEnvelope)==='LaunchRequest'; },
  async handle(h){
    const consentToken = h.requestEnvelope.context.System.user.permissions?.consentToken;
    if (!consentToken) {
      const speak = "Pour régler automatiquement les horaires de prière selon votre position, j’ai besoin d’accéder à l’adresse et au fuseau horaire de votre appareil. Je vous ai envoyé une carte dans l’application Alexa pour autoriser l’accès.";
      return h.responseBuilder
        .speak(speak)
        .withAskForPermissionsConsentCard(PERMISSIONS)
        .getResponse();
    }

    const { lat, lon, countryCode, timezone, method } = await resolveLocationAndMethod(h);

    const cityKey = `${countryCode}-${Math.round(lat*100)/100},${Math.round(lon*100)/100}`;
    await bumpCityStat({ cityKey, countryCode });

    const userId = h.requestEnvelope.context.System.user.userId;
    await saveConsent(userId, { enabled:true, onboarded:true });

    // Exemple: calcul aujourd'hui (juste pour vérif rapide)
    const now = new Date();
    computePrayerTimes({ date: now, lat, lon, tz: 0, method });

    const intro = "Bienvenue. Vos horaires seront calculés automatiquement selon votre position. Voulez-vous que je joue l’Adhan maintenant pour test ?";
    return h.responseBuilder
      .speak(intro)
      .reprompt("Souhaitez-vous un test d’Adhan maintenant ?")
      .getResponse();
  }
};

// Oui/Non sur l’essai gratuit
export const YesNoTrialHandler = {
  canHandle(h) {
    const tpe = Alexa.getRequestType(h.requestEnvelope);
    const n = Alexa.getIntentName(h.requestEnvelope);
    const s = h.attributesManager.getSessionAttributes().state;
    return tpe === 'IntentRequest' && (n === 'AMAZON.YesIntent' || n === 'AMAZON.NoIntent') && s === 'ASK_TRIAL';
  },
  handle(h) {
    const n = Alexa.getIntentName(h.requestEnvelope);
    if (n === 'AMAZON.YesIntent') {
      // Proposer choix mensuel / annuel
      h.attributesManager.setSessionAttributes({ state: 'ASK_TRIAL_CHOICE' });
      const speak = 'Souhaitez-vous la formule mensuelle à 1,99 euro ou annuelle à 19,99 euros ?';
      return h.responseBuilder.speak(speak).reprompt(speak).getResponse();
    } else {
      // Pas d’essai → passer au consentement de programmation
      h.attributesManager.setSessionAttributes({ state: 'ASK_SCHEDULING' });
      const speak = t(h).ONBOARD_TRIAL_NEXT;
      return h.responseBuilder.speak(speak).reprompt(speak).getResponse();
    }
  }
};

// Choix du plan (mensuel / annuel) → déclenche l’achat
export const TrialChoiceIntentHandler = {
  canHandle(h) {
    const tpe = Alexa.getRequestType(h.requestEnvelope);
    const s = h.attributesManager.getSessionAttributes().state;
    return tpe === 'IntentRequest' && s === 'ASK_TRIAL_CHOICE';
  },
  handle(h) {
    const spoken = (h.requestEnvelope.request.intent.slots?.plan?.value || '').toLowerCase();
    if (spoken.includes('mois') || spoken.includes('mensuel') || spoken.includes('month')) {
      return h.responseBuilder
        .speak('Très bien, je lance l’activation de l’essai gratuit mensuel.')
        .addDirective(buyMonthlyDirective())
        .getResponse();
    } else if (spoken.includes('an') || spoken.includes('annuel') || spoken.includes('year')) {
      return h.responseBuilder
        .speak('Très bien, je lance l’activation de l’essai gratuit annuel.')
        .addDirective(buyYearlyDirective())
        .getResponse();
    }
    const again = 'Dites mensuel ou annuel.';
    return h.responseBuilder.speak(again).reprompt(again).getResponse();
  }
};

// Réponse d’achat (Buy)
export const ConnectionsResponseHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'Connections.Response';
  },
  async handle(h) {
    const { payload = {}, name, status = {} } = h.requestEnvelope.request;
    // status.code: 200, name: "Buy"
    if (name === 'Buy' && status.code === 200) {
      const result = payload?.purchaseResult; // ACCEPTED | DECLINED | ALREADY_PURCHASED | ERROR
      if (result === 'ACCEPTED' || result === 'ALREADY_PURCHASED') {
        // Continuer vers consentement
        h.attributesManager.setSessionAttributes({ state: 'ASK_SCHEDULING' });
        const speak = t(h).ONBOARD_TRIAL_NEXT;
        return h.responseBuilder.speak(speak).reprompt(speak).getResponse();
      } else {
        // Achat refusé → on continue en gratuit
        h.attributesManager.setSessionAttributes({ state: 'ASK_SCHEDULING' });
        const speak = 'Pas de souci, vous restez sur la version gratuite. ' + t(h).ONBOARD_TRIAL_NEXT;
        return h.responseBuilder.speak(speak).reprompt(speak).getResponse();
      }
    }
    return h.responseBuilder.speak('D’accord.').getResponse();
  }
};

// Choix de la durée de programmation (mois/an) + enregistrement
export const SchedulingPeriodIntentHandler = {
  async canHandle(h) {
    const tpe = Alexa.getRequestType(h.requestEnvelope);
    const s = h.attributesManager.getSessionAttributes().state;
    return tpe === 'IntentRequest' && s === 'ASK_SCHEDULING';
  },
  async handle(h) {
    const userId = h.requestEnvelope.context?.System?.user?.userId;
    const val = (h.requestEnvelope.request.intent.slots?.period?.value || '').toLowerCase();
    const now = new Date();
    let until;
    if (val.includes('an') || val.includes('year')) {
      until = new Date(now); until.setFullYear(until.getFullYear() + 1);
      await saveConsent(userId, { enabled: true, consentUntilISO: until.toISOString(), onboarded: true });
      return h.responseBuilder
        .speak(t(h).ONBOARD_CONSENT_SAVED_YEAR)
        .withSimpleCard(t(h).ONBOARD_CARD_TITLE, t(h).ONBOARD_CARD_BODY)
        .withShouldEndSession(true)
        .getResponse();
    } else {
      until = new Date(now); until.setMonth(until.getMonth() + 1);
      await saveConsent(userId, { enabled: true, consentUntilISO: until.toISOString(), onboarded: true });
      return h.responseBuilder
        .speak(t(h).ONBOARD_CONSENT_SAVED_MONTH)
        .withSimpleCard(t(h).ONBOARD_CARD_TITLE, t(h).ONBOARD_CARD_BODY)
        .withShouldEndSession(true)
        .getResponse();
    }
  }
};

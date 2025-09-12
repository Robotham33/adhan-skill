// lambda-skill/handlers/intents.js
import * as Alexa from 'ask-sdk-core';

// Adapte si besoin : fichier MP3 public < 240s, URL HTTPS
const ADHAN_SHORT_URL = 'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-short.mp3';

export const PlayAdhanIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'PlayAdhanIntent';
  },
  handle(h) {
    const t = h.t || ((k)=>k);
    const ssml = `<speak>${t('STARTING_ADHAN')} <audio src="${ADHAN_SHORT_URL}"/></speak>`;
    return h.responseBuilder
      .speak(ssml)
      .withShouldEndSession(true)
      .getResponse();
  }
};

export const HelpIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(h) {
    const t = h.t || ((k)=>k);
    return h.responseBuilder
      .speak(t('HELP'))
      .reprompt(t('HELP'))
      .getResponse();
  }
};

export const PauseSchedulingIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'PauseSchedulingIntent';
  },
  handle(h) {
    // Ici on mettra la logique pour désactiver la programmation en base.
    const speech = (h.requestEnvelope.request.locale || '').startsWith('fr')
      ? "D'accord, j'arrête la programmation de l'adhan. Dis 'reprends la programmation' pour réactiver."
      : "Okay, I’ll pause adhan scheduling. Say ‘resume scheduling’ to reactivate.";
    return h.responseBuilder.speak(speech).withShouldEndSession(true).getResponse();
  }
};

export const ResumeSchedulingIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'ResumeSchedulingIntent';
  },
  handle(h) {
    // Ici on mettra la logique pour réactiver la programmation en base.
    const speech = (h.requestEnvelope.request.locale || '').startsWith('fr')
      ? "C'est reparti, je réactive la programmation de l'adhan."
      : "Done, I’ve resumed adhan scheduling.";
    return h.responseBuilder.speak(speech).withShouldEndSession(true).getResponse();
  }
};

export const CancelAndStopIntentHandler = {
  canHandle(h) {
    const t = Alexa.getRequestType(h.requestEnvelope);
    const n = Alexa.getIntentName(h.requestEnvelope);
    return t === 'IntentRequest' && (n === 'AMAZON.StopIntent' || n === 'AMAZON.CancelIntent');
  },
  handle(h) {
    const t = h.t || ((k)=>k);
    return h.responseBuilder.speak(t('STOP')).withShouldEndSession(true).getResponse();
  }
};

export const FallbackIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'AMAZON.FallbackIntent';
  },
  handle(h) {
    const t = h.t || ((k)=>k);
    return h.responseBuilder.speak(t('FALLBACK')).reprompt(t('FALLBACK')).getResponse();
  }
};

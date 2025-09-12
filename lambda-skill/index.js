// lambda-skill/index.js
import * as Alexa from 'ask-sdk-core';
import { RequestLogInterceptor } from './util/logger.js';
import LocalizationInterceptor from './util/localization.js';

import {
  PlayAdhanIntentHandler,
  HelpIntentHandler,
  PauseSchedulingIntentHandler,
  ResumeSchedulingIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler
} from './handlers/intents.js';

const LaunchRequestHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'LaunchRequest';
  },
  handle(h) {
    const t = h.t || ((k)=>k);
    return h.responseBuilder.speak(t('WELCOME')).reprompt(t('HELP')).getResponse();
  }
};

const SessionEndedRequestHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(h) {
    console.log('Session ended:', JSON.stringify(h.requestEnvelope.request || {}));
    return h.responseBuilder.getResponse();
  }
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(h, err) {
    console.error('ERROR:', err?.stack || err);
    console.error('REQUEST ENVELOPE:', JSON.stringify(h?.requestEnvelope || {}, null, 2));
    const t = h?.t || ((k)=>k);
    return h.responseBuilder.speak(t('ERROR')).withShouldEndSession(true).getResponse();
  }
};

export const handler = Alexa.SkillBuilders.custom()
  .addRequestInterceptors(RequestLogInterceptor, LocalizationInterceptor)
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayAdhanIntentHandler,
    HelpIntentHandler,
    PauseSchedulingIntentHandler,
    ResumeSchedulingIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('adhan-core/1.0')
  .lambda();

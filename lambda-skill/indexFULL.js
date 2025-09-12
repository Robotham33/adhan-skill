import * as Alexa from 'ask-sdk-core';
import { RequestLogInterceptor } from './util/logger.js';
import {
  OnboardingLaunchHandler,
  YesNoTrialHandler,
  TrialChoiceIntentHandler,
  ConnectionsResponseHandler,
  SchedulingPeriodIntentHandler
} from './handlers/onboarding.js';

import {
  PlayAdhanIntentHandler,
  HelpIntentHandler,
  PauseSchedulingIntentHandler,
  ResumeSchedulingIntentHandler,
  CancelAndStopIntentHandler,
  FallbackIntentHandler
} from './handlers/intents.js';

import { SessionEndedRequestHandler } from './handlers/session.js';
import { apiClient } from './services/monetization.js';

const ErrorHandler = {
  canHandle() { return true; },
  handle(h, err) {
    console.error('ERROR:', err?.stack || err);
    console.error('REQUEST ENVELOPE:', JSON.stringify(h.requestEnvelope, null, 2));
    const locale = h?.requestEnvelope?.request?.locale || 'en-US';
    const msg = locale.startsWith('fr')
      ? "Désolé, une erreur s'est produite. Réessaie."
      : "Sorry, something went wrong. Please try again.";
    return h.responseBuilder.speak(msg).withShouldEndSession(true).getResponse();
  }
};


export const handler = apiClient(Alexa.SkillBuilders.custom())
  .addRequestInterceptors(RequestLogInterceptor)
  .addRequestHandlers(
    OnboardingLaunchHandler,
    YesNoTrialHandler,
    TrialChoiceIntentHandler,
    ConnectionsResponseHandler,
    SchedulingPeriodIntentHandler,
    PlayAdhanIntentHandler,
    HelpIntentHandler,
    PauseSchedulingIntentHandler,
    ResumeSchedulingIntentHandler,
    CancelAndStopIntentHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .withCustomUserAgent('adhan-player/1.2')
  .lambda();

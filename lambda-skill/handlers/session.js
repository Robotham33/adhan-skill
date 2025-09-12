import * as Alexa from 'ask-sdk-core';
export const SessionEndedRequestHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(h) { return h.responseBuilder.getResponse(); }
};

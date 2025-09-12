// lambda-skill/util/logger.js
export const RequestLogInterceptor = {
  process(handlerInput) {
    try {
      const req = handlerInput.requestEnvelope?.request;
      console.log('REQ TYPE:', req?.type,
                  '| INTENT:', req?.intent?.name,
                  '| LOCALE:', req?.locale);
    } catch {}
  }
};

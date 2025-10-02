import AWS from 'aws-sdk';
const ddb = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.TABLE || 'AdhanUsers';
export const ConnectionsResponseHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'Connections.Response';
  },
  async handle(h) {
    const payload = h.requestEnvelope.request;
    const userId = h.requestEnvelope.context?.System?.user?.userId;
    let speech;
    if (payload.name === 'Buy') {
      if (payload.status.code === '200' && payload.payload.purchaseResult === 'ACCEPTED') {
        // Achat accepté, mettre à jour premium=true
        await ddb.update({
          TableName: TABLE,
          Key: { userId },
          UpdateExpression: 'SET premium = :p',
          ExpressionAttributeValues: { ':p': true }
        }).promise();
        speech = "Merci pour votre achat ! Adhan Premium est maintenant activé.";
      } else {
        speech = "L'achat n'a pas été confirmé. Vous pouvez réessayer à tout moment.";
      }
    } else if (payload.name === 'Cancel') {
      if (payload.status.code === '200' && payload.payload.purchaseResult === 'ACCEPTED') {
        // Annulation acceptée, mettre à jour premium=false
        await ddb.update({
          TableName: TABLE,
          Key: { userId },
          UpdateExpression: 'SET premium = :p',
          ExpressionAttributeValues: { ':p': false }
        }).promise();
        speech = "Votre abonnement Adhan Premium a bien été annulé.";
      } else {
        speech = "L'annulation n'a pas été confirmée. Vous pouvez réessayer à tout moment.";
      }
    } else {
      speech = "Action terminée.";
    }
    return h.responseBuilder.speak(speech).getResponse();
  }
};
// Product ID Alexa ISP
const PREMIUM_PRODUCT_ID = 'amzn1.adg.product.53144539-5fba-499d-91f7-8b8099d7abab';

export const BuyPremiumIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'BuyPremiumIntent';
  },
  async handle(h) {
    // Vérifie si l'utilisateur est déjà premium
    const monetizationServiceClient = h.serviceClientFactory.getMonetizationServiceClient();
    const result = await monetizationServiceClient.getInSkillProducts(h.requestEnvelope);
    const premiumProduct = result.inSkillProducts.find(p => p.productId === PREMIUM_PRODUCT_ID);
    const isPremium = premiumProduct && premiumProduct.entitled === 'ENTITLED';
    if (isPremium) {
      return h.responseBuilder.speak("Vous êtes déjà abonné à Adhan Premium.").getResponse();
    }
    // Lance le flow d'achat
    return h.responseBuilder.addDirective({
      type: 'Connections.SendRequest',
      name: 'Buy',
      payload: { InSkillProduct: { productId: PREMIUM_PRODUCT_ID } },
      token: 'correlationToken'
    }).getResponse();
  }
};

export const CancelPremiumIntentHandler = {
  canHandle(h) {
    return Alexa.getRequestType(h.requestEnvelope) === 'IntentRequest'
      && Alexa.getIntentName(h.requestEnvelope) === 'CancelPremiumIntent';
  },
  handle(h) {
    // Lance le flow d'annulation
    return h.responseBuilder.addDirective({
      type: 'Connections.SendRequest',
      name: 'Cancel',
      payload: { InSkillProduct: { productId: PREMIUM_PRODUCT_ID } },
      token: 'correlationToken'
    }).getResponse();
  }
};
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

const Alexa = require('ask-sdk-core');
const axios = require('axios');

const PlayAdhanIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PlayAdhanIntent';
    },
    async handle(handlerInput) {
    // Récupérer l'URL audio depuis la variable d'environnement
    const audioUrl = process.env.ADHAN_AUDIO_URL || 'https://YOUR_CLOUDFRONT_URL/adhan-33s.mp3';
    const speakOutput = `<audio src='${audioUrl}'/>`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const NextPrayerIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextPrayerIntent';
    },
    async handle(handlerInput) {
    // TODO : Récupérer la localisation utilisateur via Alexa (permissions nécessaires)
    // Voir : https://developer.amazon.com/en-US/docs/alexa/custom-skills/location-services-for-alexa-skills.html
    const city = 'Paris'; // À remplacer par la localisation réelle
    // Appel API Aladhan pour les horaires
    const response = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=France&method=2`);
    const timings = response.data.data.timings;
    // TODO : Compléter la logique pour déterminer la prochaine prière selon l'heure actuelle
    const nextPrayer = 'Fajr';
    const speakOutput = `Le prochain adhan est ${nextPrayer} à ${timings[nextPrayer]}`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        PlayAdhanIntentHandler,
        NextPrayerIntentHandler
    )
    .lambda();

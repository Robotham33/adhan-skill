// lambda-skill/util/localization.js
import i18n from 'i18next';
import sprintf from 'i18next-sprintf-postprocessor';
import fr from '../i18n/fr.js';
import en from '../i18n/en.js';

const resources = {
  'en':    { translation: en },
  'en-US': { translation: en },
  'en-GB': { translation: en },
  'fr':    { translation: fr },
  'fr-FR': { translation: fr },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    const locale = handlerInput?.requestEnvelope?.request?.locale || 'en-US';
    const client = i18n.createInstance();
    client
      .use(sprintf)
      .init({
        lng: locale,
        fallbackLng: 'en',
        resources,
        returnObjects: true,
        interpolation: { escapeValue: false },
        overloadTranslationOptionHandler: sprintf.overloadTranslationOptionHandler
      });

    // Fonction utilitaire de traduction sur handlerInput
    handlerInput.t = (...args) => client.t(...args);
  }
};

export default LocalizationInterceptor;

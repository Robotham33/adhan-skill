// lambda-skill/config/app.js
export const AUDIO = {
  adhanSmall: 'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-short.mp3',
  adhanFull:  'https://islamic-audio-hamza.s3.eu-west-3.amazonaws.com/public/adhan/adhan-nasir-al-qatami-full.mp3'
};

export const DEFAULTS = {
  // Par défaut, gratuit = short ; Premium = full
  freeAdhanUrl: AUDIO.adhanSmall,
  premiumAdhanUrl: AUDIO.adhanFull
};

export const FEATURE_FLAGS = {
  premiumUpsell: true,  // on propose l’essai
  showIntro: true
};

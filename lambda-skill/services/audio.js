import { DEFAULTS, FEATURE_FLAGS } from '../config/app.js';
import { t } from '../i18n/index.js';

export function buildAdhanSSML(h, { premium=false } = {}) {
  const intro = FEATURE_FLAGS.showIntro ? `${t(h).INTRO} ` : '';
  const url = premium ? DEFAULTS.premiumAdhanUrl : DEFAULTS.freeAdhanUrl;
  return `<speak>${intro}<audio src="${url}"/></speak>`;
}

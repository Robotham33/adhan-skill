import en from './en.js';
import fr from './fr.js';
export function t(h) {
  const loc = (h.requestEnvelope.request?.locale || 'en-US').slice(0,2);
  if (loc === 'fr') return fr;
  return en;
}

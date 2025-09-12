import fetch from 'node-fetch';
import { CountryMethodMap, CountryCapitalCoords, ContinentFallback } from '../config/geo.js';

export async function getDeviceSettings(handlerInput){
  const { deviceId } = handlerInput.requestEnvelope.context.System.device;
  const ups = handlerInput.serviceClientFactory.getUpsServiceClient();

  let timezone='Europe/Paris';
  try { timezone = await ups.getSystemTimeZone(deviceId); } catch(e){ console.log('TZ read failed', e); }

  let address=null;
  try {
    const addr = handlerInput.serviceClientFactory.getDeviceAddressServiceClient();
    address = await addr.getFullAddress(deviceId);
  } catch(e){ console.log('Full address read failed (no permission?)'); }

  return { timezone, address };
}

export async function geocodeAddress(address){
  if (!address) return null;
  const q = [address.addressLine1, address.addressLine2, address.addressLine3, address.city, address.stateOrRegion, address.postalCode, address.countryCode]
    .filter(Boolean).join(' ');
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({ q, format:'json', limit:'1' });
  try {
    const res = await fetch(url, { headers:{ 'User-Agent':'adhan-skill/1.0 (lambda)' }});
    const arr = await res.json();
    if (Array.isArray(arr) && arr.length>0) return { lat:+arr[0].lat, lon:+arr[0].lon };
  } catch(e){ console.log('Geocode error', e); }
  return null;
}

function guessContinentFromTz(tz=''){
  const head = tz.split('/')[0].toUpperCase();
  if (head==='PACIFIC'||head==='AUSTRALIA') return 'OCEANIA';
  if (head==='INDIAN'||head==='ATLANTIC')   return 'EUROPE';
  if (['EUROPE','ASIA','AFRICA','AMERICA','OCEANIA'].includes(head)) return head;
  return 'DEFAULT';
}

export async function resolveLocationAndMethod(handlerInput){
  const localeCC = (handlerInput.requestEnvelope.request?.locale || 'fr-FR').split('-')[1] || 'FR';
  const { timezone, address } = await getDeviceSettings(handlerInput);
  const countryCode = (address?.countryCode) || localeCC;

  let coords = await geocodeAddress(address);
  if (!coords) coords = CountryCapitalCoords[countryCode] || null;
  if (!coords){
    const fb = ContinentFallback[guessContinentFromTz(timezone)] || ContinentFallback.DEFAULT;
    coords = { lat: fb.lat, lon: fb.lon };
  }
  const method = CountryMethodMap[countryCode] || CountryMethodMap.DEFAULT;
  return { lat:coords.lat, lon:coords.lon, countryCode, timezone, method };
}

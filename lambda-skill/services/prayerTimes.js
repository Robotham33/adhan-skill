import { CalculationMethods } from '../config/geo.js';

function D2R(d){return (Math.PI/180)*d;} function R2D(r){return (180/Math.PI)*r;}
function sin(d){return Math.sin(D2R(d));} function cos(d){return Math.cos(D2R(d));}
function tan(d){return Math.tan(D2R(d));} function asin(x){return R2D(Math.asin(x));}
function acos(x){return R2D(Math.acos(x));} function atan(x){return R2D(Math.atan(x));}
function fixAngle(a){return a-360*Math.floor(a/360);} function fixHour(a){return a-24*Math.floor(a/24);}

function julian(date){
  const a=Math.floor((14-(date.getUTCMonth()+1))/12);
  const y=date.getUTCFullYear()+4800-a;
  const m=(date.getUTCMonth()+1)+12*a-3;
  let J=date.getUTCDate()+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
  return { jd:J+(date.getUTCHours()-12)/24+date.getUTCMinutes()/1440 };
}

function sunPosition(t){
  const D=t-2451545;
  const g=fixAngle(357.529+0.98560028*D);
  const q=fixAngle(280.459+0.98564736*D);
  const L=fixAngle(q+1.915*sin(g)+0.020*sin(2*g));
  const e=23.439-0.00000036*D;
  const RA=atan(cos(e)*tan(L))/15;
  const eqt=q/15-fixHour(RA);
  const decl=asin(sin(e)*sin(L));
  return { decl, eqt };
}

function hourToDate(baseDate, tz, h){
  const d=new Date(baseDate.getTime());
  d.setUTCHours(0,0,0,0);
  d.setUTCSeconds(Math.round((h - tz)*3600));
  return d;
}
function midDay(eqt){return fixHour(12 - eqt);}
function sunAngleTime(angle, lat, decl, isRise, mid){
  const t=(1/15)*acos((-sin(angle)-sin(decl)*sin(lat))/(cos(decl)*cos(lat)));
  return mid+(isRise?-t:t);
}
function asrTime(factor, lat, decl, mid){
  const angle=-atan(1/(factor+tan(Math.abs(lat-decl))));
  return sunAngleTime(angle, lat, decl, false, mid);
}

const MethodParams = {
  MWL:{ fajr:18, isha:17, maghrib:0, ishaAfterMaghrib:false },
  ISNA:{ fajr:15, isha:15, maghrib:0, ishaAfterMaghrib:false },
  EGAS:{ fajr:19.5, isha:17.5, maghrib:0, ishaAfterMaghrib:false },
  MAKKAH:{ fajr:18.5, isha:90, maghrib:0, ishaAfterMaghrib:true },
  KARACHI:{ fajr:18, isha:18, maghrib:0, ishaAfterMaghrib:false },
  TURKEY:{ fajr:18, isha:17, maghrib:0, ishaAfterMaghrib:false },
  JAFARI:{ fajr:16, isha:14, maghrib:4, ishaAfterMaghrib:false }
};

export function computePrayerTimes({ date, lat, lon, tz, method=CalculationMethods.MWL, asrHanafi=false }){
  const dUTC=new Date(date.toLocaleString('en-US',{timeZone:'UTC'}));
  const { jd }=julian(dUTC);
  const { decl, eqt }=sunPosition(jd);
  const mid=midDay(eqt);
  const p=MethodParams[method]||MethodParams.MWL;

  const dhuhr=mid;
  const fajr   = sunAngleTime(p.fajr,   lat, decl, true,  mid);
  const sunrise= sunAngleTime(0.833,    lat, decl, true,  mid);
  const asr    = asrTime(asrHanafi?2:1, lat, decl, mid);
  const maghrib= p.maghrib>0?sunAngleTime(p.maghrib, lat, decl, false, mid):sunAngleTime(0.833, lat, decl, false, mid);
  const isha   = p.ishaAfterMaghrib? maghrib + p.isha/60 : sunAngleTime(p.isha, lat, decl, false, mid);

  const toDate=h=>hourToDate(date, tz, h);
  return { fajr:toDate(fajr), sunrise:toDate(sunrise), dhuhr:toDate(dhuhr), asr:toDate(asr), maghrib:toDate(maghrib), isha:toDate(isha) };
}

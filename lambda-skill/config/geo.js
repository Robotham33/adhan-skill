// lambda-skill/config/geo.js
export const CalculationMethods = {
  MWL: 'MWL', ISNA: 'ISNA', EGAS: 'EGAS',
  MAKKAH: 'MAKKAH', KARACHI: 'KARACHI',
  TURKEY: 'TURKEY', JAFARI: 'JAFARI'
};

export const CountryMethodMap = {
  SA:'MAKKAH', AE:'MAKKAH', QA:'MAKKAH', KW:'MAKKAH', BH:'MAKKAH', OM:'MAKKAH',
  TR:'TURKEY', EG:'EGAS',  PK:'KARACHI', IN:'KARACHI', BD:'KARACHI',
  US:'ISNA',   CA:'ISNA',
  GB:'MWL', FR:'MWL', DE:'MWL', NL:'MWL', BE:'MWL', ES:'MWL', IT:'MWL',
  MA:'MWL', DZ:'MWL', TN:'MWL',
  DEFAULT:'MWL'
};

export const CountryCapitalCoords = {
  FR:{lat:48.8566, lon:2.3522},   GB:{lat:51.5074, lon:-0.1278},
  DE:{lat:52.5200, lon:13.4050},  NL:{lat:52.3676, lon:4.9041},
  BE:{lat:50.8503, lon:4.3517},   ES:{lat:40.4168, lon:-3.7038},
  IT:{lat:41.9028, lon:12.4964},
  MA:{lat:33.5731, lon:-7.5898},  DZ:{lat:36.7538, lon:3.0588}, TN:{lat:36.8065, lon:10.1815},
  SA:{lat:24.7136, lon:46.6753},  AE:{lat:24.4539, lon:54.3773}, EG:{lat:30.0444, lon:31.2357},
  PK:{lat:24.8607, lon:67.0011},  IN:{lat:28.6139, lon:77.2090}, BD:{lat:23.8103, lon:90.4125},
  US:{lat:38.9072, lon:-77.0369}, CA:{lat:45.4215, lon:-75.6972}
};

export const ContinentFallback = {
  EUROPE:  {lat:48.8566, lon:2.3522, method:'MWL'},
  ASIA:    {lat:24.7136, lon:46.6753, method:'MAKKAH'},
  AFRICA:  {lat:30.0444, lon:31.2357, method:'EGAS'},
  AMERICA: {lat:40.7128, lon:-74.0060, method:'ISNA'},
  OCEANIA: {lat:-33.8688, lon:151.2093, method:'MWL'},
  DEFAULT: {lat:21.3891, lon:39.8579, method:'MAKKAH'}
};

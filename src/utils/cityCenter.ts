// Lebanon bounding box — any coordinate outside this is rejected so a listing
// can never be pinned in another region or country.
const LEBANON_BOUNDS = { minLat: 33.0, maxLat: 34.75, minLng: 34.95, maxLng: 36.7 };

const inLebanon = (lat: number, lng: number) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= LEBANON_BOUNDS.minLat &&
  lat <= LEBANON_BOUNDS.maxLat &&
  lng >= LEBANON_BOUNDS.minLng &&
  lng <= LEBANON_BOUNDS.maxLng;

// Authoritative coordinates for Lebanese cities/towns. These are used first so
// pin locations are stable and never depend on a third-party lookup.
const KNOWN_CITIES: Record<string, { lat: number; lng: number }> = {
  beirut: { lat: 33.8938, lng: 35.5018 },
  achrafieh: { lat: 33.8869, lng: 35.5203 },
  ashrafieh: { lat: 33.8869, lng: 35.5203 },
  hamra: { lat: 33.8959, lng: 35.4805 },
  verdun: { lat: 33.8797, lng: 35.4826 },
  badaro: { lat: 33.8756, lng: 35.5165 },
  gemmayzeh: { lat: 33.8959, lng: 35.5164 },
  mazraa: { lat: 33.8742, lng: 35.4984 },
  ramlet: { lat: 33.8696, lng: 35.4801 },
  'ramlet al baida': { lat: 33.8696, lng: 35.4801 },
  'raouche': { lat: 33.8895, lng: 35.4732 },
  manara: { lat: 33.8977, lng: 35.4749 },
  'downtown beirut': { lat: 33.8959, lng: 35.5044 },
  'ras beirut': { lat: 33.8977, lng: 35.4783 },
  sinelfil: { lat: 33.8722, lng: 35.5486 },
  'sin el fil': { lat: 33.8722, lng: 35.5486 },
  'dekwaneh': { lat: 33.8639, lng: 35.5589 },
  'jdeideh': { lat: 33.8917, lng: 35.5617 },
  'zalka': { lat: 33.8958, lng: 35.5744 },
  'antelias': { lat: 33.9139, lng: 35.5872 },
  'dbayeh': { lat: 33.9458, lng: 35.5933 },
  'jal el dib': { lat: 33.9047, lng: 35.5872 },
  'naccache': { lat: 33.9219, lng: 35.5931 },
  'rabieh': { lat: 33.9083, lng: 35.6086 },
  'mansourieh': { lat: 33.8664, lng: 35.5825 },
  'beit mery': { lat: 33.8531, lng: 35.6044 },
  broumana: { lat: 33.8847, lng: 35.6222 },
  brummana: { lat: 33.8847, lng: 35.6222 },
  bikfaya: { lat: 33.9181, lng: 35.6803 },
  'baabda': { lat: 33.8339, lng: 35.5442 },
  hazmieh: { lat: 33.8531, lng: 35.5450 },
  'furn el chebbak': { lat: 33.8639, lng: 35.5333 },
  chiyah: { lat: 33.8567, lng: 35.5153 },
  ghobeiry: { lat: 33.8631, lng: 35.5019 },
  haret: { lat: 33.8461, lng: 35.5175 },
  'haret hreik': { lat: 33.8461, lng: 35.5175 },
  aley: { lat: 33.8106, lng: 35.5978 },
  bhamdoun: { lat: 33.7972, lng: 35.6567 },
  'khalde': { lat: 33.7500, lng: 35.4800 },
  damour: { lat: 33.7297, lng: 35.4550 },
  jounieh: { lat: 33.9808, lng: 35.6178 },
  kaslik: { lat: 33.9769, lng: 35.6103 },
  zouk: { lat: 33.9683, lng: 35.6136 },
  'zouk mosbeh': { lat: 33.9683, lng: 35.6136 },
  'zouk mikael': { lat: 33.9711, lng: 35.6117 },
  adma: { lat: 34.0033, lng: 35.6300 },
  'ghazir': { lat: 34.0136, lng: 35.6600 },
  'jbeil': { lat: 34.1211, lng: 35.6481 },
  byblos: { lat: 34.1211, lng: 35.6481 },
  batroun: { lat: 34.2553, lng: 35.6581 },
  chekka: { lat: 34.3167, lng: 35.7167 },
  tripoli: { lat: 34.4367, lng: 35.8497 },
  'el mina': { lat: 34.4500, lng: 35.8167 },
  koura: { lat: 34.3333, lng: 35.8167 },
  zgharta: { lat: 34.3986, lng: 35.8942 },
  bcharre: { lat: 34.2508, lng: 36.0106 },
  ehden: { lat: 34.2911, lng: 35.9783 },
  akkar: { lat: 34.5386, lng: 36.0836 },
  halba: { lat: 34.5433, lng: 36.0800 },
  saida: { lat: 33.5606, lng: 35.3758 },
  sidon: { lat: 33.5606, lng: 35.3758 },
  tyre: { lat: 33.2733, lng: 35.1939 },
  sour: { lat: 33.2733, lng: 35.1939 },
  jezzine: { lat: 33.5450, lng: 35.5789 },
  nabatieh: { lat: 33.3789, lng: 35.4839 },
  marjayoun: { lat: 33.3611, lng: 35.5919 },
  zahle: { lat: 33.8463, lng: 35.9019 },
  chtaura: { lat: 33.8206, lng: 35.8556 },
  baalbek: { lat: 34.0059, lng: 36.2181 },
  hermel: { lat: 34.3925, lng: 36.3861 },
  rayak: { lat: 33.8506, lng: 35.9847 },
  anjar: { lat: 33.7297, lng: 35.9317 },
  faraya: { lat: 34.0139, lng: 35.8203 },
  kfardebian: { lat: 34.0028, lng: 35.8139 },
  'deir el qamar': { lat: 33.6950, lng: 35.5567 },
  beiteddine: { lat: 33.6939, lng: 35.5814 },
  'chouf': { lat: 33.6667, lng: 35.6000 },
};

// Cache for city center lookups (in-memory + persisted for the session)
const cityCache: Record<string, { lat: number; lng: number }> = {};

const STORAGE_KEY = 'rumi_city_centers_v1';

const loadPersisted = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, { lat: number; lng: number }>;
    Object.entries(parsed).forEach(([k, v]) => {
      if (v && inLebanon(v.lat, v.lng)) cityCache[k] = v;
    });
  } catch {
    /* ignore */
  }
};
loadPersisted();

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cityCache));
  } catch {
    /* ignore */
  }
};

const normalize = (city: string) =>
  city
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ');

const lookupKnown = (key: string) => {
  if (KNOWN_CITIES[key]) return KNOWN_CITIES[key];
  // Match on the leading part of compound names, e.g. "Beirut - Achrafieh"
  const first = key.split(/[,\-/]/)[0].trim();
  if (first && KNOWN_CITIES[first]) return KNOWN_CITIES[first];
  // Match a known city contained in the string
  const hit = Object.keys(KNOWN_CITIES).find(
    (k) => k.length > 3 && key.includes(k)
  );
  return hit ? KNOWN_CITIES[hit] : null;
};

/**
 * Look up the center coordinates of a Lebanese city.
 * Uses a fixed table first, then a country-restricted geocode, and always
 * validates the result falls inside Lebanon before it is used or cached.
 */
export const getCityCenter = async (
  city: string
): Promise<{ lat: number; lng: number } | null> => {
  if (!city) return null;

  const key = normalize(city);

  const known = lookupKnown(key);
  if (known) return known;

  if (cityCache[key]) return cityCache[key];

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&accept-language=en&countrycodes=lb&bounded=1&viewbox=${LEBANON_BOUNDS.minLng},${LEBANON_BOUNDS.maxLat},${LEBANON_BOUNDS.maxLng},${LEBANON_BOUNDS.minLat}&q=${encodeURIComponent(
        city + ', Lebanon'
      )}&limit=1`,
      { headers: { Accept: 'application/json' } }
    );
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (inLebanon(lat, lng)) {
        const result = { lat, lng };
        cityCache[key] = result;
        persist();
        return result;
      }
    }
  } catch (error) {
    console.error('Error fetching city center:', error);
  }

  return null;
};

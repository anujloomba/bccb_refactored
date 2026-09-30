export interface LatLng {
  lat: number;
  lng: number;
}

export interface TravelEstimate {
  durationSeconds: number;
  distanceMeters: number;
  source: 'openrouteservice' | 'estimate';
}

export interface Place {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const ROUTE_ATTRIBUTION = '© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors';
export const SEARCH_ATTRIBUTION = 'Search © OpenStreetMap contributors (Nominatim)';
export const GEO_USER_AGENT = 'BCCB-Cricket-Manager/2.2 (+https://github.com/anujloomba/bccb_refactored)';

const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const EARTH_RADIUS_METERS = 6_371_008.8;
// Straight-line distance is converted to a road estimate with a typical urban detour and speed.
const ROAD_DETOUR_FACTOR = 1.35;
const AVERAGE_URBAN_SPEED_MPS = 35_000 / 3_600;
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const routeCache = new Map<string, { value: TravelEstimate; expiresAt: number }>();
const placeCache = new Map<string, { value: Place[]; expiresAt: number }>();

export function clearGeoCaches(): void {
  routeCache.clear();
  placeCache.clear();
}

export function haversineMeters(from: LatLng, to: LatLng): number {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function estimateTravel(from: LatLng, to: LatLng): TravelEstimate {
  const distanceMeters = haversineMeters(from, to) * ROAD_DETOUR_FACTOR;
  return {
    durationSeconds: Math.round(distanceMeters / AVERAGE_URBAN_SPEED_MPS),
    distanceMeters: Math.round(distanceMeters),
    source: 'estimate'
  };
}

function remember<T>(cache: Map<string, { value: T; expiresAt: number }>, key: string, value: T, ttlMs: number): T {
  if (cache.size >= MAX_CACHE_ENTRIES) cache.clear();
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export async function routeTravel(env: Env, from: LatLng, to: LatLng): Promise<TravelEstimate> {
  if (haversineMeters(from, to) < 30) {
    return { durationSeconds: 0, distanceMeters: 0, source: 'estimate' };
  }

  const cacheKey = [from.lat, from.lng, to.lat, to.lng].map(value => value.toFixed(4)).join(',');
  const cached = routeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  if (env.ORS_API_KEY) {
    try {
      const response = await fetch(ORS_DIRECTIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: env.ORS_API_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ coordinates: [[from.lng, from.lat], [to.lng, to.lat]] }),
        signal: AbortSignal.timeout(8000)
      });
      if (response.ok) {
        const payload = await response.json() as {
          routes?: Array<{ summary?: { duration?: number; distance?: number } }>;
        };
        const summary = payload.routes?.[0]?.summary;
        if (
          summary
          && typeof summary.duration === 'number' && Number.isFinite(summary.duration)
          && typeof summary.distance === 'number' && Number.isFinite(summary.distance)
        ) {
          return remember(routeCache, cacheKey, {
            durationSeconds: Math.round(summary.duration),
            distanceMeters: Math.round(summary.distance),
            source: 'openrouteservice'
          }, ROUTE_CACHE_TTL_MS);
        }
      } else {
        console.warn(`OpenRouteService returned HTTP ${response.status}; using the distance estimate.`);
      }
    } catch (error) {
      console.warn('OpenRouteService request failed; using the distance estimate.', error);
    }
  }

  return remember(routeCache, cacheKey, estimateTravel(from, to), ROUTE_CACHE_TTL_MS);
}

interface NominatimResult {
  lat?: string;
  lon?: string;
  name?: string;
  display_name?: string;
}

function toPlace(result: NominatimResult): Place | null {
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  const address = typeof result.display_name === 'string' ? result.display_name : '';
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !address) return null;
  const name = typeof result.name === 'string' && result.name.trim()
    ? result.name.trim()
    : address.split(',')[0].trim();
  return { name, address, lat, lng };
}

async function nominatim(env: Env, path: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(path, NOMINATIM_BASE_URL);
  Object.entries({ format: 'jsonv2', ...params }).forEach(([key, value]) => url.searchParams.set(key, value));
  if (env.NOMINATIM_EMAIL) url.searchParams.set('email', env.NOMINATIM_EMAIL);
  const response = await fetch(url.toString(), {
    headers: { 'User-Agent': GEO_USER_AGENT, Accept: 'application/json', 'Accept-Language': 'en' },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error(`Venue search is unavailable (HTTP ${response.status}).`);
  return response.json();
}

export async function searchPlaces(env: Env, query: string): Promise<Place[]> {
  const cacheKey = `search:${query.toLowerCase()}`;
  const cached = placeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const results = await nominatim(env, '/search', { q: query, limit: '6', addressdetails: '0' });
  const places = Array.isArray(results)
    ? results.map(result => toPlace(result as NominatimResult)).filter((place): place is Place => place !== null)
    : [];
  return remember(placeCache, cacheKey, places, SEARCH_CACHE_TTL_MS);
}

export async function reversePlace(env: Env, point: LatLng): Promise<Place | null> {
  const cacheKey = `reverse:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
  const cached = placeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value[0] ?? null;
  const result = await nominatim(env, '/reverse', {
    lat: String(point.lat),
    lon: String(point.lng),
    zoom: '17'
  });
  const place = result && typeof result === 'object' ? toPlace(result as NominatimResult) : null;
  remember(placeCache, cacheKey, place ? [place] : [], SEARCH_CACHE_TTL_MS);
  return place;
}

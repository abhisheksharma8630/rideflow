import type { GeoPoint } from '../types';

/** Preset Chandigarh landmarks used by the deterministic location picker fallback. */
export interface NamedPlace extends GeoPoint {
  address: string;
}

export const PRESET_PLACES: NamedPlace[] = [
  { address: 'Sector 17 Plaza, Chandigarh', latitude: 30.7411, longitude: 76.7822 },
  { address: 'Elante Mall, Industrial Area Phase 1', latitude: 30.7056, longitude: 76.8013 },
  { address: 'PGIMER, Sector 12', latitude: 30.7645, longitude: 76.7752 },
  { address: 'Sukhna Lake', latitude: 30.7421, longitude: 76.8188 },
  { address: 'ISBT Sector 43', latitude: 30.7079, longitude: 76.7616 },
  { address: 'Rock Garden', latitude: 30.7525, longitude: 76.8103 },
  { address: 'Chandigarh Railway Station', latitude: 30.6999, longitude: 76.8104 },
  { address: 'Panjab University, Sector 14', latitude: 30.7606, longitude: 76.7664 },
];

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

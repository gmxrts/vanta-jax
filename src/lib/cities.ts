export interface City {
  slug: string;
  name: string;
  state: string;
  mapCenter: [number, number]; // [lng, lat]
  mapZoom: number;
}

// Add new cities here — routes and queries will pick them up automatically.
export const CITIES: City[] = [
  {
    slug: 'jacksonville-fl',
    name: 'Jacksonville',
    state: 'FL',
    mapCenter: [-81.6557, 30.3322],
    mapZoom: 11,
  },
];

export const DEFAULT_CITY = CITIES[0];

export function getCityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function assertCity(slug: string): City {
  const city = getCityBySlug(slug);
  if (!city) throw new Error(`Unknown city slug: ${slug}`);
  return city;
}

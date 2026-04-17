export const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN as string | undefined;

if (!MAPBOX_TOKEN) {
  console.error(
    '[VantaJax] PUBLIC_MAPBOX_TOKEN is not set. ' +
    'Add it to .env.local and your Vercel project settings.'
  );
}

export const JAX_MAP_CONFIG = {
  style:  'mapbox://styles/mapbox/light-v11',
  center: [-81.6557, 30.3322] as [number, number],
  zoom:   11,
};

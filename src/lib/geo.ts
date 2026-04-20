import { supabase } from './supabaseClient';
import type { Business } from './types';

export async function getBusinessesNearby(
  userLat: number,
  userLng: number,
  citySlug: string,
  radiusMeters = 8047
): Promise<Business[]> {
  const { data, error } = await supabase.rpc('businesses_nearby', {
    user_lat: userLat,
    user_lng: userLng,
    city: citySlug,
    radius_m: radiusMeters,
  });

  if (error) throw error;
  return data as Business[];
}

export function requestUserLocation(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position.coords),
      (err) => reject(new Error(`Location request failed: ${err.message}`)),
      { timeout: 8000 }
    );
  });
}

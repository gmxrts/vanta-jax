import type { APIRoute } from 'astro';

export const prerender = false;

const JAX_CENTER = { latitude: 30.3322, longitude: -81.6557 };

// Convert Google Places regularOpeningHours.periods to our JSONB hours format
function convertGoogleHours(
  periods: Array<{ open?: { day: number; hour: number; minute: number }; close?: { day: number; hour: number; minute: number } }>
): Record<string, { open: string | null; close: string | null; closed: boolean }> {
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const result: Record<string, { open: string | null; close: string | null; closed: boolean }> = {};

  for (const key of dayKeys) {
    result[key] = { open: null, close: null, closed: true };
  }

  for (const period of periods) {
    if (period.open?.day == null) continue;
    const dayName = dayKeys[period.open.day];
    if (!dayName) continue;
    const pad = (n: number) => String(n).padStart(2, '0');
    const openStr = `${pad(period.open.hour ?? 0)}:${pad(period.open.minute ?? 0)}`;
    const closeStr = period.close
      ? `${pad(period.close.hour ?? 0)}:${pad(period.close.minute ?? 0)}`
      : null;
    result[dayName] = { open: openStr, close: closeStr, closed: false };
  }

  return result;
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Google Places API key is not configured.' }),
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400 });
  }

  const { businessName, city } = body || {};
  if (!businessName?.trim()) {
    return new Response(JSON.stringify({ error: 'businessName is required.' }), { status: 400 });
  }

  const textQuery = `${String(businessName).trim()} ${String(city || 'Jacksonville').trim()} FL`;

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.nationalPhoneNumber',
          'places.websiteUri',
          'places.regularOpeningHours',
          'places.editorialSummary',
          'places.location',
        ].join(','),
      },
      body: JSON.stringify({
        textQuery,
        maxResultCount: 3,
        locationBias: {
          circle: {
            center: JAX_CENTER,
            radius: 50000.0,
          },
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Google Places API error:', res.status, errText);

      // Parse Google's JSON error for a clean message
      let googleMessage = `HTTP ${res.status}`;
      try {
        const errJson = JSON.parse(errText);
        googleMessage = errJson?.error?.message || errJson?.error?.status || googleMessage;
      } catch {
        googleMessage = errText.slice(0, 200) || googleMessage;
      }

      return new Response(
        JSON.stringify({
          error: `Google Places error (${res.status}): ${googleMessage}`,
        }),
        { status: 502 }
      );
    }

    const data = await res.json();
    const rawPlaces: any[] = data.places ?? [];

    const places = rawPlaces.map((p: any) => ({
      id: p.id ?? '',
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      phone: p.nationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      description: p.editorialSummary?.text ?? null,
      latitude: p.location?.latitude ?? null,
      longitude: p.location?.longitude ?? null,
      hours: p.regularOpeningHours?.periods
        ? convertGoogleHours(p.regularOpeningHours.periods)
        : null,
    }));

    return new Response(JSON.stringify({ places }), { status: 200 });
  } catch (err: any) {
    console.error('places-search error:', err);
    return new Response(
      JSON.stringify({ error: err?.message ?? 'Unknown error contacting Google Places.' }),
      { status: 500 }
    );
  }
};

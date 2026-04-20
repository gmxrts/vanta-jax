import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { businessId?: string; key?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { businessId, key } = body;

  if (!key || key !== import.meta.env.ADMIN_ACCESS_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  if (!businessId) {
    return new Response(JSON.stringify({ error: "businessId required." }), { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: business } = await supabase
    .from("businesses")
    .select("id, address, city, state, zip")
    .eq("id", businessId)
    .single();

  if (!business) {
    return new Response(JSON.stringify({ error: "Business not found." }), { status: 404 });
  }

  const fullAddress = [business.address, business.city, business.state, business.zip]
    .filter(Boolean)
    .join(", ");

  const encoded = encodeURIComponent(fullAddress);
  const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encoded}&key=${import.meta.env.GOOGLE_PLACES_API_KEY}`;

  const geoRes = await fetch(geocodeUrl);
  const geoData = await geoRes.json();

  if (geoData.status !== "OK" || !geoData.results?.length) {
    return new Response(JSON.stringify({ error: "Geocoding failed.", status: geoData.status }), { status: 400 });
  }

  const { lat, lng } = geoData.results[0].geometry.location;

  const { error: updateErr } = await supabase
    .from("businesses")
    .update({ lat, lng })
    .eq("id", businessId);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true, lat, lng }), { status: 200 });
};

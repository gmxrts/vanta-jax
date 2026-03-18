import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

export const POST: APIRoute = async ({ request }) => {
  if (!supabase) {
    return new Response(
      JSON.stringify({ error: 'Server Supabase is not configured.' }),
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), { status: 400 });
  }

  const { businessId, ...fields } = body || {};

  if (!businessId) {
    return new Response(JSON.stringify({ error: 'businessId is required.' }), { status: 400 });
  }

  const allowed = [
    'name', 'category', 'description', 'address', 'city', 'state', 'zip',
    'phone', 'website', 'logo_url', 'business_type', 'is_address_public',
    'public_location_label', 'service_area', 'latitude', 'longitude',
    'verified', 'featured',
  ];

  const update: Record<string, any> = {};
  for (const key of allowed) {
    if (key in fields) update[key] = fields[key];
  }

  if (Object.keys(update).length === 0) {
    return new Response(JSON.stringify({ error: 'No valid fields to update.' }), { status: 400 });
  }

  const { error } = await supabase.from('businesses').update(update).eq('id', businessId);

  if (error) {
    console.error('Error updating business:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to update business.' }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

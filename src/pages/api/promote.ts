import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

export const POST: APIRoute = async ({ request }) => {
  if (!supabase || !supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Server Supabase is not configured.' }),
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch (err) {
    console.error('Error parsing JSON body:', err);
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
    });
  }

  const {
    suggestionId,
    name,
    category,
    address,
    city,
    state,
    zip,
    phone,
    website,
    description,
    verified,
    latitude,
    longitude,
    business_type,
    is_address_public,
    logo_url,
    service_area,
    public_location_label,
  } = body || {};

  if (!suggestionId || !name) {
    return new Response(
      JSON.stringify({ error: 'suggestionId and name are required.' }),
      { status: 400 }
    );
  }

  const business: Record<string, any> = {
    name: String(name).trim(),
    category: category || 'services',
    address: address || null,
    city: city || null,
    state: state || null,
    zip: zip || null,
    description: description || null,
    phone: phone || null,
    website: website || null,
    verified: typeof verified === 'boolean' ? verified : true,
  };

  // Phase 3 fields
  if (latitude != null) business.latitude = Number(latitude);
  if (longitude != null) business.longitude = Number(longitude);
  if (business_type) business.business_type = business_type;
  if (is_address_public != null) business.is_address_public = Boolean(is_address_public);
  if (logo_url) business.logo_url = logo_url;
  if (service_area) business.service_area = service_area;
  if (public_location_label) business.public_location_label = public_location_label;

  // Insert into businesses
  const { error: insertError } = await supabase.from('businesses').insert(business);

  if (insertError) {
    console.error('Error inserting business:', insertError);
    return new Response(
      JSON.stringify({
        error: insertError.message || 'Failed to insert business.',
      }),
      { status: 500 }
    );
  }

  // Remove from suggestions
  const { error: deleteError } = await supabase
    .from('business_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (deleteError) {
    console.error('Error deleting suggestion:', deleteError);
    // Not fatal — insert already succeeded
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

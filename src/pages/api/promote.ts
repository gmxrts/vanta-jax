import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false; // <-- critical: this makes the route server-only

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
  } = body || {};

  if (!suggestionId || !name) {
    return new Response(
      JSON.stringify({ error: 'suggestionId and name are required.' }),
      { status: 400 }
    );
  }

  const business = {
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

  // Remove from suggestions (optional but nice)
  const { error: deleteError } = await supabase
    .from('business_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (deleteError) {
    console.error('Error deleting suggestion:', deleteError);
    // Not fatal for the user – insert already succeeded
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

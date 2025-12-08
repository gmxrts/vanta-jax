import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false; // server-only

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
    console.error('Error parsing JSON body (reject):', err);
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
    });
  }

  const { suggestionId } = body || {};

  if (!suggestionId) {
    return new Response(
      JSON.stringify({ error: 'suggestionId is required.' }),
      { status: 400 }
    );
  }

  const { error: deleteError } = await supabase
    .from('business_suggestions')
    .delete()
    .eq('id', suggestionId);

  if (deleteError) {
    console.error('Error deleting suggestion:', deleteError);
    return new Response(
      JSON.stringify({
        error: deleteError.message || 'Failed to delete suggestion.',
      }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

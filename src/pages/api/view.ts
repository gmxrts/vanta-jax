import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase =
  supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

export const POST: APIRoute = async ({ request }) => {
  if (!supabase) {
    return new Response(JSON.stringify({ error: 'Not configured.' }), { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), { status: 400 });
  }

  const { businessId } = body || {};
  if (!businessId || typeof businessId !== 'string') {
    return new Response(JSON.stringify({ error: 'businessId required.' }), { status: 400 });
  }

  // Read current count, then increment — acceptable for a view counter
  const { data, error: fetchError } = await supabase
    .from('businesses')
    .select('view_count')
    .eq('id', businessId)
    .single();

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const current = (data?.view_count as number) || 0;

  const { error: updateError } = await supabase
    .from('businesses')
    .update({ view_count: current + 1 })
    .eq('id', businessId);

  if (updateError) {
    console.error('view increment error:', updateError);
    return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

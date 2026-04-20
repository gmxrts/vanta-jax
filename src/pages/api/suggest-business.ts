import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { limiters, checkRateLimit } from '../../lib/ratelimit';

export const prerender = false;

const adminSb = createClient(
  import.meta.env.PUBLIC_SUPABASE_URL,
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY
);

export const POST: APIRoute = async ({ request }) => {
  const { allowed } = await checkRateLimit(limiters?.suggestion, request);
  if (!allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Retry-After': '3600', 'Content-Type': 'application/json' },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON.' }), { status: 400 });
  }

  const { name, city, state, website, notes } = (body as Record<string, unknown>) ?? {};

  if (!name || typeof name !== 'string' || !name.trim()) {
    return new Response(JSON.stringify({ error: 'Business name is required.' }), { status: 400 });
  }

  const { error } = await adminSb.from('business_suggestions').insert({
    name: (name as string).trim().slice(0, 120),
    city: typeof city === 'string' && city.trim() ? city.trim().slice(0, 80) : null,
    state: typeof state === 'string' && state.trim() ? state.trim().toUpperCase().slice(0, 2) : 'FL',
    website: typeof website === 'string' && website.trim() ? website.trim().slice(0, 200) : null,
    notes: typeof notes === 'string' && notes.trim() ? notes.trim().slice(0, 1000) : null,
  });

  if (error) {
    console.error('suggest-business insert error:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit suggestion.' }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const key = request.headers.get("x-admin-key") || new URL(request.url).searchParams.get("key");
  if (!adminKey || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  let body: { claimId?: string; notes?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { claimId, notes } = body;
  if (!claimId) {
    return new Response(JSON.stringify({ error: "claimId required." }), { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supabase
    .from("business_claims")
    .update({ status: "rejected", notes: notes || null })
    .eq("id", claimId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  // Admin key check
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

  // Fetch the claim
  const { data: claim } = await supabase
    .from("business_claims")
    .select("id, business_id, user_id")
    .eq("id", claimId)
    .single();

  if (!claim) {
    return new Response(JSON.stringify({ error: "Claim not found." }), { status: 404 });
  }

  // Approve claim
  const { error: claimErr } = await supabase
    .from("business_claims")
    .update({ status: "approved", approved_at: new Date().toISOString(), notes: notes || null })
    .eq("id", claimId);

  if (claimErr) {
    return new Response(JSON.stringify({ error: claimErr.message }), { status: 500 });
  }

  // Update business
  const { error: bizErr } = await supabase
    .from("businesses")
    .update({ is_claimed: true, claimed_by: claim.user_id })
    .eq("id", claim.business_id);

  if (bizErr) {
    return new Response(JSON.stringify({ error: bizErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

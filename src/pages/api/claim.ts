import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../lib/supabaseServer";
import { sendClaimSubmitted } from "../../lib/email";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context as any);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  let body: { businessId?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { businessId } = body;
  if (!businessId) {
    return new Response(JSON.stringify({ error: "businessId required." }), { status: 400 });
  }

  const adminSb = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Check business exists and isn't already claimed
  const { data: business } = await adminSb
    .from("businesses")
    .select("id, is_claimed")
    .eq("id", businessId)
    .single();

  if (!business) {
    return new Response(JSON.stringify({ error: "Business not found." }), { status: 404 });
  }
  if (business.is_claimed) {
    return new Response(JSON.stringify({ error: "This listing has already been claimed." }), { status: 409 });
  }

  // Check for existing claim from this user
  const { data: existing } = await adminSb
    .from("business_claims")
    .select("id, status")
    .eq("business_id", businessId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ error: "You already have a claim for this business.", status: existing.status }), { status: 409 });
  }

  // Fetch business name for the confirmation email
  const { data: bizFull } = await adminSb
    .from("businesses")
    .select("name")
    .eq("id", businessId)
    .single();

  // Create the claim
  const { error } = await adminSb.from("business_claims").insert({
    business_id: businessId,
    user_id: session.user.id,
    status: "pending",
    verification_method: session.user.app_metadata?.provider ?? "email",
  });

  if (error) {
    console.error("Claim insert error:", error);
    return new Response(JSON.stringify({ error: "Failed to create claim." }), { status: 500 });
  }

  // Send confirmation email (fire-and-forget)
  const ownerEmail = session.user.email;
  if (ownerEmail && bizFull?.name) {
    sendClaimSubmitted(ownerEmail, bizFull.name).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

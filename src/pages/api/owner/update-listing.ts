import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../lib/supabaseServer";

export const prerender = false;

// Fields owners are allowed to update
const ALLOWED_FIELDS = ["name", "description", "phone", "website", "service_area", "instagram_url", "facebook_url", "tiktok_url", "hours", "woman_owned_requested"] as const;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context as any);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  let body: Record<string, any>;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { businessId, ...fields } = body;
  if (!businessId) {
    return new Response(JSON.stringify({ error: "businessId required." }), { status: 400 });
  }

  const adminSb = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify this owner has an approved claim on this business
  const { data: claim } = await adminSb
    .from("business_claims")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", session.user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!claim) {
    return new Response(JSON.stringify({ error: "You don't have an approved claim on this listing." }), { status: 403 });
  }

  // Only allow permitted fields
  const update: Record<string, any> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in fields) {
      const val = fields[field];
      // Treat empty strings as null for optional fields
      update[field] = (typeof val === "string" && val.trim() === "") ? null : val;
    }
  }

  if (!update.name) {
    return new Response(JSON.stringify({ error: "Name is required." }), { status: 400 });
  }

  const { error } = await adminSb
    .from("businesses")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", businessId);

  if (error) {
    console.error("Owner update error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

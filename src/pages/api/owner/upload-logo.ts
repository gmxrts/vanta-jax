import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../../lib/supabaseServer";

export const prerender = false;

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context as any);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return new Response(JSON.stringify({ error: "Not authenticated." }), { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await context.request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data." }), { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const businessId = formData.get("businessId") as string | null;

  if (!file || !businessId) {
    return new Response(JSON.stringify({ error: "file and businessId required." }), { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: "Invalid file type. Use PNG, JPG, SVG, or WEBP." }), { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return new Response(JSON.stringify({ error: "File too large. Max 2 MB." }), { status: 400 });
  }

  const adminSb = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Verify approved claim
  const { data: claim } = await adminSb
    .from("business_claims")
    .select("id")
    .eq("business_id", businessId)
    .eq("user_id", session.user.id)
    .eq("status", "approved")
    .maybeSingle();

  if (!claim) {
    return new Response(JSON.stringify({ error: "No approved claim found." }), { status: 403 });
  }

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${businessId}/logo.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await adminSb.storage
    .from("business-logos")
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadErr) {
    console.error("Logo upload error:", uploadErr);
    return new Response(JSON.stringify({ error: uploadErr.message }), { status: 500 });
  }

  // Get public URL
  const { data: urlData } = adminSb.storage
    .from("business-logos")
    .getPublicUrl(path);

  const logo_url = urlData.publicUrl;

  // Update business record
  const { error: updateErr } = await adminSb
    .from("businesses")
    .update({ logo_url })
    .eq("id", businessId);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, logo_url }), { status: 200 });
};

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const key = request.headers.get("x-admin-key") || new URL(request.url).searchParams.get("key");
  if (!adminKey || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  let body: { businessId?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { businessId } = body;
  if (!businessId) {
    return new Response(JSON.stringify({ error: "businessId required." }), { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch current count first, then increment
  const { data: current, error: fetchError } = await supabase
    .from("businesses")
    .select("outreach_count")
    .eq("id", businessId)
    .single();

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const newCount = ((current?.outreach_count as number) ?? 0) + 1;

  const { error } = await supabase
    .from("businesses")
    .update({
      outreach_sent_at: new Date().toISOString(),
      outreach_count: newCount,
    })
    .eq("id", businessId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true, outreach_count: newCount, outreach_sent_at: new Date().toISOString() }), { status: 200 });
};

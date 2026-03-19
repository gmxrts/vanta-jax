import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const key = request.headers.get("x-admin-key") || new URL(request.url).searchParams.get("key");
  if (!adminKey || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  let body: { businessId?: string; action?: "archive" | "restore" };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { businessId, action } = body;
  if (!businessId || !action || !["archive", "restore"].includes(action)) {
    return new Response(JSON.stringify({ error: "businessId and action (archive|restore) required." }), { status: 400 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const patch =
    action === "archive"
      ? { is_archived: true, archived_at: new Date().toISOString() }
      : { is_archived: false, archived_at: null };

  const { error } = await supabase
    .from("businesses")
    .update(patch)
    .eq("id", businessId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

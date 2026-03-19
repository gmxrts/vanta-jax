import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabaseServer";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const supabase = createSupabaseServerClient(context as any);
  await supabase.auth.signOut();
  return new Response(null, {
    status: 302,
    headers: { Location: "/" },
  });
};

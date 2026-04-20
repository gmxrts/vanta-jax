import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import { sendVerificationOutreach, sendOwnerOutreach } from "../../../lib/email";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const key = request.headers.get("x-admin-key");
  if (!adminKey || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  let body: {
    businessId?: string;
    to?: string;
    firstName?: string;
    businessName?: string;
    template?: "verification" | "owner";
    customNote?: string;
    howFound?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { businessId, to, firstName, businessName, template = "verification", customNote, howFound } = body;
  if (!businessId || !to || !firstName || !businessName) {
    return new Response(JSON.stringify({ error: "businessId, to, firstName, and businessName are required." }), { status: 400 });
  }

  const emailResult = template === "owner"
    ? await sendOwnerOutreach({ to, firstName, businessName, businessId, howFound })
    : await sendVerificationOutreach({ to, firstName, businessName, businessId, customNote });

  if (emailResult.error) {
    return new Response(JSON.stringify({ error: emailResult.error.message }), { status: 500 });
  }

  const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: current } = await supabase
    .from("businesses")
    .select("outreach_count")
    .eq("id", businessId)
    .single();

  const newCount = ((current?.outreach_count as number) ?? 0) + 1;
  const sentAt = new Date().toISOString();

  await supabase
    .from("businesses")
    .update({ outreach_sent_at: sentAt, outreach_count: newCount })
    .eq("id", businessId);

  return new Response(JSON.stringify({ ok: true, outreach_count: newCount, outreach_sent_at: sentAt }), { status: 200 });
};

import type { APIRoute } from "astro";
import { resend } from "../../../lib/email";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { email } = body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "A valid email address is required." }), { status: 400 });
  }

  const audienceId = import.meta.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return new Response(JSON.stringify({ error: "Newsletter not configured." }), { status: 500 });
  }

  const result = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false,
  });

  if (result.error) {
    const msg = result.error.message ?? "";
    if (
      (result.error.name as string) === "already_exists" ||
      msg.toLowerCase().includes("already exists") ||
      msg.toLowerCase().includes("duplicate")
    ) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

import type { APIRoute } from "astro";
import { resend } from "../../lib/email";

export const prerender = false;

// One-click unsubscribe per RFC 8058 — called by email clients automatically
export const POST: APIRoute = async ({ request }) => {
  let email: string | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await request.text();
    const params = new URLSearchParams(text);
    email = params.get("email") ?? new URL(request.url).searchParams.get("email");
  } else {
    email = new URL(request.url).searchParams.get("email");
    if (!email) {
      try {
        const body = await request.json();
        email = body?.email ?? null;
      } catch { /* ignore */ }
    }
  }

  if (!email) {
    return new Response("", { status: 400 });
  }

  const audienceId = import.meta.env.RESEND_AUDIENCE_ID;
  if (audienceId) {
    const contacts = await resend.contacts.list({ audienceId });
    const match = contacts.data?.data?.find((c: { email: string }) => c.email === email);
    if (match?.id) {
      await resend.contacts.update({ id: match.id, audienceId, unsubscribed: true });
    }
  }

  return new Response("", { status: 200 });
};

// Handles the unsubscribe link click from inside the email body
export const GET: APIRoute = async ({ request, redirect }) => {
  const email = new URL(request.url).searchParams.get("email") ?? "";
  return redirect(`/unsubscribe?email=${encodeURIComponent(email)}`, 302);
};

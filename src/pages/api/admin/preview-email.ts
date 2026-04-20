import type { APIRoute } from "astro";
import { verificationOutreachEmail, ownerOutreachEmail } from "../../../lib/email";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;
  const key = request.headers.get("x-admin-key");
  if (!adminKey || key !== adminKey) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 401 });
  }

  let body: {
    template?: "verification" | "owner";
    firstName?: string;
    businessName?: string;
    businessId?: string;
    customNote?: string;
    howFound?: string;
  };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request." }), { status: 400 });
  }

  const { template, firstName, businessName, businessId, customNote, howFound } = body;
  if (!template || !firstName || !businessName || !businessId) {
    return new Response(JSON.stringify({ error: "template, firstName, businessName, businessId required." }), { status: 400 });
  }

  const html =
    template === "verification"
      ? verificationOutreachEmail({ firstName, businessName, businessId, customNote })
      : ownerOutreachEmail({ firstName, businessName, businessId, howFound });

  return new Response(JSON.stringify({ html }), { status: 200 });
};

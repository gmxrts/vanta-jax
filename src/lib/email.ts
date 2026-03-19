const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
const FROM = "Vanta <noreply@resend.dev>";
const SITE_URL = import.meta.env.PUBLIC_SITE_URL || "https://vanta-jax.vercel.app";

async function send(to: string, subject: string, html: string, text: string) {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email to", to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM, to, subject, html, text }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    console.error(`Resend error (${res.status}):`, err);
  }
}

function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Vanta</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
<tr>
<td align="center" style="padding:40px 16px;">
<table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0" role="presentation">
<!-- Logo -->
<tr>
<td style="padding-bottom:28px;">
<p style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#581c87;">Vanta</p>
</td>
</tr>
<!-- Card -->
<tr>
<td style="background:#ffffff;border-radius:20px;border:1px solid #e2e8f0;padding:32px;box-shadow:0 4px 24px -8px rgba(0,0,0,0.08);">
${body}
</td>
</tr>
<!-- Footer -->
<tr>
<td style="padding-top:24px;">
<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;">
Vanta · <a href="${SITE_URL}" style="color:#7c3aed;text-decoration:none;">vanta-jax.vercel.app</a>
· <a href="mailto:vantajacksonville@gmail.com" style="color:#94a3b8;text-decoration:none;">vantajacksonville@gmail.com</a>
</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

const btnStyle = "display:inline-block;background:#9333ea;color:#ffffff;font-weight:700;font-size:13px;padding:12px 24px;border-radius:14px;text-decoration:none;";

export async function sendClaimSubmitted(ownerEmail: string, businessName: string) {
  const subject = `We got your claim — ${businessName}`;

  const html = wrapHtml(`
<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">Claim Received</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">We got it.</h1>
<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#334155;">
  Your claim for <strong>${businessName}</strong> is in review. We'll notify you here once it's approved — usually within a day or two.
</p>
<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#334155;">
  Once approved, you'll get access to your owner dashboard where you can update your info, add a logo, and see how many people are finding you.
</p>
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0f172a;">— Gavin Marts</p>
<p style="margin:0;font-size:12px;color:#64748b;">Founder, Vanta</p>
`);

  const text = `Claim received for ${businessName}\n\nYour claim is in review. We'll notify you when it's approved.\n\n— Gavin Marts, Founder of Vanta\nvantajacksonville@gmail.com`;

  await send(ownerEmail, subject, html, text);
}

export async function sendClaimApproved(
  ownerEmail: string,
  businessName: string,
  businessId: string,
  notes?: string | null
) {
  const listingUrl = `${SITE_URL}/business/${businessId}`;
  const dashboardUrl = `${SITE_URL}/dashboard`;
  const subject = `You're approved — ${businessName} is yours to manage`;

  const html = wrapHtml(`
<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#10b981;">Claim Approved</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Welcome to Vanta, ${businessName}.</h1>
<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#334155;">
  Your claim is approved. You now have full control of your listing — update your info, add a logo, and see how many people are finding you.
</p>
${notes ? `<p style="margin:0 0 12px;font-size:13px;line-height:1.7;color:#475569;background:#f8fafc;border-left:3px solid #9333ea;padding:10px 14px;border-radius:0 8px 8px 0;"><strong>Note from admin:</strong> ${notes}</p>` : ""}
<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#334155;">
  Your listing is live at: <a href="${listingUrl}" style="color:#7c3aed;">${listingUrl}</a>
</p>
<a href="${dashboardUrl}" style="${btnStyle}">Go to your dashboard →</a>
<p style="margin:24px 0 4px;font-size:13px;font-weight:600;color:#0f172a;">— Gavin Marts</p>
<p style="margin:0;font-size:12px;color:#64748b;">Founder, Vanta</p>
`);

  const text = `Claim approved for ${businessName}\n\nYour listing is live: ${listingUrl}\nGo to your dashboard: ${dashboardUrl}\n\n${notes ? `Note from admin: ${notes}\n\n` : ""}— Gavin Marts, Founder of Vanta`;

  await send(ownerEmail, subject, html, text);
}

export async function sendClaimRejected(
  ownerEmail: string,
  businessName: string,
  notes?: string | null
) {
  const subject = `Update on your claim — ${businessName}`;

  const html = wrapHtml(`
<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#94a3b8;">Claim Update</p>
<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">We couldn't approve this claim.</h1>
<p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#334155;">
  Your claim for <strong>${businessName}</strong> wasn't approved at this time.
</p>
${notes ? `<p style="margin:0 0 24px;font-size:13px;line-height:1.7;color:#475569;background:#f8fafc;border-left:3px solid #e2e8f0;padding:10px 14px;border-radius:0 8px 8px 0;"><strong>Reason:</strong> ${notes}</p>` : `<p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#334155;">If you believe this is an error or have questions, reply to this email and we'll take another look.</p>`}
<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0f172a;">— Gavin Marts</p>
<p style="margin:0;font-size:12px;color:#64748b;">Founder, Vanta · vantajacksonville@gmail.com</p>
`);

  const text = `Claim update for ${businessName}\n\nYour claim wasn't approved at this time.${notes ? `\n\nReason: ${notes}` : "\n\nIf you have questions, reply to this email."}\n\n— Gavin Marts, Founder of Vanta`;

  await send(ownerEmail, subject, html, text);
}

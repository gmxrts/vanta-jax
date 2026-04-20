import { Resend } from 'resend';

export const resend = new Resend(import.meta.env.RESEND_API_KEY);

const BASE_URL = 'https://vantacollective.org';

// ─── Shared styles ────────────────────────────────────────────────────────────

const sharedStyles = `
  body { margin: 0; padding: 0; background-color: #F0EEFF; font-family: Georgia, 'Times New Roman', serif; }
  .outer { background-color: #F0EEFF; padding: 40px 16px; }
  .container { max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.08); }
  .header { padding: 28px 36px 24px; border-bottom: 1px solid rgba(0,0,0,0.07); }
  .wordmark { font-family: Georgia, serif; font-size: 20px; font-weight: normal; letter-spacing: -0.01em; color: #7C3AED; }
  .wordmark span { color: #1C1C1C; }
  .pilot-badge { display: inline-block; font-family: -apple-system, sans-serif; font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; background: #EDE9FE; color: #6D28D9; padding: 3px 10px; border-radius: 999px; margin-top: 10px; }
  .body { padding: 32px 36px; font-size: 16px; line-height: 1.7; color: #1C1C1C; }
  .body p { margin: 0 0 16px; }
  .body p:last-child { margin-bottom: 0; }
  .cta { display: inline-block; margin: 6px 0 20px; background-color: #7C3AED; color: #ffffff !important; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-family: -apple-system, sans-serif; font-size: 15px; font-weight: 500; }
  .sig { margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(0,0,0,0.07); font-size: 14px; color: #444441; line-height: 1.8; }
  .sig strong { display: block; font-size: 15px; color: #1C1C1C; font-weight: 600; font-family: -apple-system, sans-serif; }
  .sig a { color: #7C3AED; text-decoration: none; }
  .footer { padding: 18px 36px; background: #F8F6FF; border-top: 1px solid rgba(0,0,0,0.06); font-family: -apple-system, sans-serif; font-size: 12px; color: #888; line-height: 1.6; }
  .footer a { color: #7C3AED; text-decoration: none; }
`;

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function wrap(content: string, footerNote?: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${sharedStyles}</style>
</head>
<body>
  <div class="outer">
    <div class="container">
      <div class="header">
        <div class="wordmark">Vanta<span>Jax</span></div>
        <div class="pilot-badge">Pilot</div>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        ${footerNote ?? ''}
        You're receiving this because you have a listing on <a href="${BASE_URL}">VantaJax</a> —
        a free directory for Black-owned businesses in Jacksonville, FL.<br/>
        &copy; ${new Date().getFullYear()} VantaJax &middot; <a href="${BASE_URL}/privacy">Privacy</a> &middot; <a href="${BASE_URL}/terms">Terms</a>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Template: Claim submitted ────────────────────────────────────────────────

function claimSubmittedEmail(businessName: string): string {
  const dashboardUrl = `${BASE_URL}/dashboard`;

  const content = `
    <p>We got it.</p>
    <p>
      Your claim for <strong>${businessName}</strong> is in review. We'll notify you here once
      it's approved — usually within a day or two.
    </p>
    <p>
      Once approved, you'll get access to your owner dashboard where you can update your info,
      add a logo, and see how many people are finding you.
    </p>
    <a class="cta" href="${dashboardUrl}">View your dashboard &rarr;</a>
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, VantaJax<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content, 'You received this because you submitted a claim. &nbsp;&middot;&nbsp; ');
}

// ─── Template: Claim approved ─────────────────────────────────────────────────

function claimApprovedEmail(businessName: string, businessId: string, notes?: string | null): string {
  const listingUrl = `${BASE_URL}/businesses/${businessId}`;
  const dashboardUrl = `${BASE_URL}/dashboard`;

  const content = `
    <p>Your claim for <strong>${businessName}</strong> has been approved.</p>
    <p>
      Your listing is live on VantaJax and the community can already find you.
      Since we're in <strong>beta</strong>, you're among the first businesses on the platform —
      thank you for being part of this.
    </p>
    ${notes ? `<p style="background:#F8F6FF;border-left:3px solid #7C3AED;padding:10px 14px;border-radius:0 6px 6px 0;font-size:14px;"><strong>Note from admin:</strong> ${notes}</p>` : ''}
    <p>
      Head to your dashboard to finish setting things up — add your hours, upload a logo,
      and write a short description so people know exactly what you offer.
    </p>
    <p>Your listing: <a href="${listingUrl}" style="color:#7C3AED;">${listingUrl}</a></p>
    <a class="cta" href="${dashboardUrl}">Go to your dashboard &rarr;</a>
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, VantaJax<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content);
}

// ─── Template: Claim rejected ─────────────────────────────────────────────────

function claimRejectedEmail(businessName: string, notes?: string | null): string {
  const content = `
    <p>We couldn't approve your claim for <strong>${businessName}</strong> at this time.</p>
    ${notes
      ? `<p style="background:#F8F6FF;border-left:3px solid rgba(0,0,0,0.15);padding:10px 14px;border-radius:0 6px 6px 0;font-size:14px;"><strong>Reason:</strong> ${notes}</p>`
      : `<p>If you believe this is an error or have questions, reply to this email and we'll take another look.</p>`
    }
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, VantaJax<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content, 'You received this because you submitted a claim. &nbsp;&middot;&nbsp; ');
}

// ─── Template: Verification outreach ─────────────────────────────────────────

export function verificationOutreachEmail({
  firstName,
  businessName,
  businessId,
  customNote,
}: {
  firstName: string;
  businessName: string;
  businessId: string;
  customNote?: string;
}) {
  const claimUrl = `${BASE_URL}/claim/${businessId}`;

  const content = `
    <p>Hi ${firstName},</p>
    <p>
      My name is Gavin — I'm building <strong>Vanta Collective</strong>, a free directory for Black-owned
      businesses, entrepreneurs, and professionals in Jacksonville, FL. No ads, no fees,
      no gatekeeping. Just a clean, trusted place for the community to discover and support
      businesses like yours.
    </p>
    <p>
      <strong>${businessName}</strong> is already featured in the directory. To keep your
      listing accurate and unlock your owner dashboard — hours, logo, description, stats —
      you can claim it below.
    </p>
    <p>
      <strong>Claiming also verifies your Black-owned status</strong>, which is how we
      keep the directory trustworthy for people specifically looking to support
      Black-owned businesses in Jacksonville.
    </p>
    ${customNote ? `<p style="background:#F8F6FF;border-left:3px solid #7C3AED;padding:10px 14px;border-radius:0 6px 6px 0;font-size:14px;">${customNote}</p>` : ''}
    <a class="cta" href="${claimUrl}">Claim your listing &rarr;</a>
    <p style="font-size:14px;color:#555;">
      It takes about two minutes. No cost, ever.
    </p>
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, Vanta<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content, 'This is a one-time outreach. No further emails unless you claim your listing. &nbsp;&middot;&nbsp; ');
}

// ─── Template: Owner outreach ─────────────────────────────────────────────────

export function ownerOutreachEmail({
  firstName,
  businessName,
  businessId,
  howFound,
}: {
  firstName: string;
  businessName: string;
  businessId: string;
  howFound?: string;
}) {
  const claimUrl = `${BASE_URL}/claim/${businessId}`;
  const discovery = howFound ?? 'while looking for Black-owned businesses in Jacksonville';

  const content = `
    <p>Hi ${firstName},</p>
    <p>I came across ${businessName} ${discovery} and wanted to reach out personally.</p>
    <p>
      I'm building <strong>VantaJax</strong> — a free directory for Black-owned businesses,
      entrepreneurs, and professionals right here in Jacksonville. No ads, no pay-to-play,
      no gatekeeping. Just a clean, trusted place for the community to find and support
      businesses like yours.
    </p>
    <p>
      We're currently in our <strong>pilot</strong>, which means you'd be one of the first businesses
      featured on the platform. I'd love to include ${businessName}. Claiming your listing is
      completely free and takes just a few minutes — add your hours, logo, description, and links.
      Once you claim it, it's yours to manage.
    </p>
    <a class="cta" href="${claimUrl}">Claim your listing &rarr;</a>
    <p>
      If you have any questions or just want to talk, feel free to send your replies to.
      I read every message.
    </p>
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, VantaJax<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content, 'This is a one-time outreach. No further emails unless you claim your listing. &nbsp;&middot;&nbsp; ');
}

// ─── Template: Claim confirmed ────────────────────────────────────────────────

export function claimConfirmedEmail({
  firstName,
  businessName,
}: {
  firstName: string;
  businessName: string;
}) {
  const dashboardUrl = `${BASE_URL}/dashboard`;

  const content = `
    <p>Hi ${firstName},</p>
    <p>
      Your ownership claim for <strong>${businessName}</strong> has been approved.
      Your listing is live on VantaJax and the community can already find you.
    </p>
    <p>
      Since we're in <strong>beta</strong>, you're among the first businesses on the platform —
      your early presence helps us build something the Jacksonville community can rely on.
      Thank you for being part of this.
    </p>
    <p>
      Head to your dashboard to finish setting things up — add your hours, upload a logo,
      and write a short description so people know exactly what you offer.
    </p>
    <a class="cta" href="${dashboardUrl}">Go to your dashboard &rarr;</a>
    <p>
      If anything looks off or you need help with your listing, just reply to this email.
    </p>
    <p>Welcome to the directory — glad to have ${businessName} here.</p>
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, VantaJax<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content);
}

// ─── Template: Suggestion received ───────────────────────────────────────────

export function suggestionReceivedEmail({
  firstName,
  businessName,
}: {
  firstName?: string;
  businessName: string;
}) {
  const greeting = firstName ? `Hey ${firstName},` : `Hey there,`;

  const content = `
    <p>${greeting}</p>
    <p>
      Thanks for submitting <strong>${businessName}</strong> to VantaJax. We review every
      suggestion before it goes live, and we'll reach out to the business directly to let them
      know they've been recommended by the community.
    </p>
    <p>
      We're currently in <strong>beta</strong>, so your suggestion genuinely helps us grow
      the directory. If the business is approved, it'll show up within a few days — we'll
      drop you a note when it's live.
    </p>
    <p>
      This is exactly how the directory grows — one recommendation at a time. Appreciate you.
    </p>
    <div class="sig">
      <strong>Gavin Marts</strong>
      Founder, VantaJax<br/>
      <a href="${BASE_URL}">vantacollective.org</a>
    </div>
  `;

  return wrap(content, 'You received this because you submitted a business suggestion. &nbsp;&middot;&nbsp; ');
}

// ─── Unsubscribe headers (RFC 8058) ──────────────────────────────────────────

function unsubscribeHeaders(email: string) {
  return {
    'List-Unsubscribe': `<${BASE_URL}/unsubscribe?email=${encodeURIComponent(email)}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

// ─── Send helpers (existing API routes) ──────────────────────────────────────

export async function sendClaimSubmitted(ownerEmail: string, businessName: string) {
  return resend.emails.send({
    from: 'VantaJax <outreach@vantacollective.org>',
    to: ownerEmail,
    subject: `We got your claim — ${businessName}`,
    html: claimSubmittedEmail(businessName),
    headers: unsubscribeHeaders(ownerEmail),
  });
}

export async function sendClaimApproved(
  ownerEmail: string,
  businessName: string,
  businessId: string,
  notes?: string | null
) {
  return resend.emails.send({
    from: 'VantaJax <outreach@vantacollective.org>',
    to: ownerEmail,
    subject: `You're approved — ${businessName} is yours to manage`,
    html: claimApprovedEmail(businessName, businessId, notes),
    headers: unsubscribeHeaders(ownerEmail),
  });
}

export async function sendClaimRejected(
  ownerEmail: string,
  businessName: string,
  notes?: string | null
) {
  return resend.emails.send({
    from: 'VantaJax <outreach@vantacollective.org>',
    to: ownerEmail,
    subject: `Update on your claim — ${businessName}`,
    html: claimRejectedEmail(businessName, notes),
    headers: unsubscribeHeaders(ownerEmail),
  });
}

// ─── Send helpers (new) ───────────────────────────────────────────────────────

export async function sendVerificationOutreach({
  to,
  firstName,
  businessName,
  businessId,
  customNote,
}: {
  to: string;
  firstName: string;
  businessName: string;
  businessId: string;
  customNote?: string;
}) {
  return resend.emails.send({
    from: 'Gavin Marts <outreach@vantacollective.org>',
    replyTo: 'vantacollectivellc@gmail.com',
    to,
    subject: `${businessName} is listed on Vanta — claim your listing`,
    html: verificationOutreachEmail({ firstName, businessName, businessId, customNote }),
    headers: unsubscribeHeaders(to),
  });
}

export async function sendOwnerOutreach({
  to,
  firstName,
  businessName,
  businessId,
  howFound,
}: {
  to: string;
  firstName: string;
  businessName: string;
  businessId: string;
  howFound?: string;
}) {
  return resend.emails.send({
    from: 'Gavin Marts <outreach@vantacollective.org>',
    replyTo: 'vantacollectivellc@gmail.com',
    to,
    subject: `We'd love to feature ${businessName} on VantaJax`,
    html: ownerOutreachEmail({ firstName, businessName, businessId, howFound }),
    headers: unsubscribeHeaders(to),
  });
}

export async function sendClaimConfirmed({
  to,
  firstName,
  businessName,
}: {
  to: string;
  firstName: string;
  businessName: string;
}) {
  return resend.emails.send({
    from: 'VantaJax <outreach@vantacollective.org>',
    to,
    subject: `Your claim for ${businessName} is confirmed`,
    html: claimConfirmedEmail({ firstName, businessName }),
    headers: unsubscribeHeaders(to),
  });
}

export async function sendSuggestionReceived({
  to,
  firstName,
  businessName,
}: {
  to: string;
  firstName?: string;
  businessName: string;
}) {
  return resend.emails.send({
    from: 'VantaJax <outreach@vantacollective.org>',
    to,
    subject: `We got your suggestion — thanks for looking out`,
    html: suggestionReceivedEmail({ firstName, businessName }),
    headers: unsubscribeHeaders(to),
  });
}

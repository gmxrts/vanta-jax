import type { APIRoute } from "astro";
import { ImageResponse } from "@vercel/og";
import { createSupabaseServerClient } from "../../../lib/supabaseServer";

export const prerender = false;

const CATEGORY_LABELS: Record<string, string> = {
  food:         "Food & Drink",
  beauty:       "Beauty & Personal Care",
  health:       "Health & Wellness",
  retail:       "Retail & Shopping",
  professional: "Professional Services",
  creative:     "Creative Arts",
  home:         "Home Services",
  education:    "Education & Coaching",
  events:       "Events & Entertainment",
  finance:      "Finance & Insurance",
  technology:   "Technology",
  nonprofit:    "Nonprofit & Community",
  other:        "Business",
};

export const GET: APIRoute = async (context) => {
  const { params } = context;
  const supabase = createSupabaseServerClient(context as any);

  const { data: business } = await supabase
    .from("businesses")
    .select("name, category, city, state, logo_url, verified, woman_owned")
    .eq("id", params.id)
    .single();

  if (!business) {
    return new Response("Not found", { status: 404 });
  }

  const categoryLabel = CATEGORY_LABELS[business.category] ?? "Business";
  const subtitle = `${categoryLabel} · ${business.city}, ${business.state}`;

  const badges: { text: string }[] = [];
  if (business.verified) badges.push({ text: "✓ Verified Black-Owned Business" });
  if (business.woman_owned) badges.push({ text: "✦ Woman-Owned" });

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "48px",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 48,
            left: 48,
            fontSize: 20,
            color: "#888",
            letterSpacing: "0.1em",
            fontVariant: "small-caps",
          }}
        >
          VANTAJAX
        </div>

        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 16,
          }}
        >
          {business.name}
        </div>

        <div style={{ fontSize: 24, color: "#aaa", marginBottom: badges.length ? 20 : 0 }}>
          {subtitle}
        </div>

        {badges.length > 0 && (
          <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 4 }}>
            {badges.map((badge) => (
              <div
                key={badge.text}
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 16,
                  color: "#ccc",
                }}
              >
                {badge.text}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 }
  );
};

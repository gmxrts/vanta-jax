import { businessLogoUrl } from "../lib/storage";
import type { Business } from "../lib/types";

const WARM_COLORS = ['#F4E4C1', '#D4E8D4', '#E4D4E8', '#D4E4F4', '#F4D4D4', '#D4F4E8', '#F4F0D4', '#E8D4D4'];

function nameToColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0x7fffffff;
  }
  const bg = WARM_COLORS[hash % WARM_COLORS.length];
  const r = parseInt(bg.slice(1, 3), 16);
  const g = parseInt(bg.slice(3, 5), 16);
  const b = parseInt(bg.slice(5, 7), 16);
  return { bg, text: `rgb(${Math.round(r * 0.45)}, ${Math.round(g * 0.45)}, ${Math.round(b * 0.45)})` };
}

function formatCategory(slug: string | null | undefined): string {
  if (!slug) return "";
  if (slug === "nonprofit") return "Community";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function cleanDescription(desc: string | null | undefined): string | null {
  if (!desc) return null;
  return desc.replace(/^Type:\s*[^\n]+\n\n?/i, "").replace(/^Serves:\s*[^\n]+\n\n?/i, "").trim() || null;
}

function locationLabel(b: Business): string | null {
  const type = b.business_type;
  if (type === "online_only") return null;
  if (type === "service_based") {
    if (b.service_area) return `Serves: ${b.service_area}`;
    if (b.public_location_label) return b.public_location_label;
    return "Jacksonville, FL area";
  }
  if (b.is_address_public === false) return b.public_location_label || null;
  const parts = [b.address, b.city, b.state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

type Props = { business: Business };

export default function BusinessCard({ business: b }: Props) {
  const logoUrl = businessLogoUrl(b.logo_path, { width: 120, quality: 85 }) ?? b.logo_url ?? null;
  const initials = b.name?.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
  const { bg: avatarBg, text: avatarText } = nameToColor(b.name ?? "");
  const desc = cleanDescription(b.description);
  const loc = locationLabel(b);
  const isOnline = b.business_type === "online_only";
  const isMobile = b.business_type === "service_based";

  return (
    <a
      href={`/businesses/${b.id}`}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        borderRadius: 16,
        border: "1px solid var(--border)",
        borderLeft: b.verified ? "2px solid var(--accent)" : "1px solid var(--border)",
        background: "var(--bg-secondary)",
        textDecoration: "none",
        color: "inherit",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 24px rgba(201,168,76,0.16)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "";
      }}
    >
      {/* Logo + name + badges */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${b.name} logo`}
            loading="lazy"
            decoding="async"
            style={{ width: 48, height: 48, borderRadius: 12, objectFit: "cover", border: "1px solid var(--border)", flexShrink: 0 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 12, background: avatarBg, color: avatarText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, flexShrink: 0, letterSpacing: "0.03em" }}>
            {initials}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.3, marginBottom: 5 }}>
            {b.name}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {b.verified && (
              <span className="vj-badge-verified">Verified</span>
            )}
            {b.african_diaspora && (
              <span className="vj-badge-african-diaspora">African Diaspora</span>
            )}
            {b.caribbean_diaspora && (
              <span className="vj-badge-caribbean-diaspora">Caribbean Diaspora</span>
            )}
            {b.woman_owned && (
              <span style={{ fontSize: 9, fontWeight: 700, background: "var(--color-woman-owned-bg)", color: "var(--color-woman-owned-text)", border: "1px solid #F9A8D4", borderRadius: 100, padding: "1px 5px" }}>
                Woman-Owned
              </span>
            )}
          </div>
        </div>
      </div>

      {b.category && (
        <span style={{ display: "inline-block", marginTop: 10, alignSelf: "flex-start", fontSize: 11, fontWeight: 600, background: "#FDF6E3", color: "#8B6914", border: "1px solid rgba(201,168,76,0.25)", borderRadius: 100, padding: "1px 8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {formatCategory(b.category)}
        </span>
      )}

      {(loc || isOnline) && (
        <p style={{ marginTop: 7, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4, margin: "7px 0 0" }}>
          {isMobile && (
            <span style={{ marginRight: 4, background: "var(--bg-primary)", borderRadius: 4, padding: "1px 5px", fontSize: 10, fontWeight: 500 }}>Mobile</span>
          )}
          {isOnline ? "Online only" : loc}
        </p>
      )}

      {desc && (
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", flex: 1 }}>
          {desc}
        </p>
      )}

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
          View details →
        </span>
      </div>
    </a>
  );
}

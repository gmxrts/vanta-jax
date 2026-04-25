import { businessLogoUrl } from "../lib/storage";
import { getOpenStatus } from "../lib/hours";
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

type Props = {
  business: Business;
  distanceMeters?: number | null;
  isLast?: boolean;
};

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return miles < 0.1 ? "Nearby" : `${miles.toFixed(1)} mi`;
}

function formatCategory(slug: string | null | undefined): string {
  if (!slug) return "";
  if (slug === "nonprofit") return "Community";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

export default function BusinessListRow({ business: b, distanceMeters, isLast = false }: Props) {
  const openStatus = b.hours ? getOpenStatus(b.hours) : null;
  const logoUrl = businessLogoUrl(b.logo_path, { width: 80, quality: 85 }) ?? b.logo_url ?? null;
  const dist = distanceMeters ?? b.dist_meters ?? null;

  const initials =
    b.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?";
  const { bg: avatarBg, text: avatarText } = nameToColor(b.name ?? "");

  return (
    <a
      href={`/businesses/${b.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        minHeight: 80,
        padding: "16px 16px",
        textDecoration: "none",
        color: "inherit",
        borderBottom: isLast ? "none" : "1px solid var(--border)",
        borderLeft: b.verified ? "2px solid var(--accent)" : "2px solid transparent",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow =
          "0 4px 16px rgba(201,168,76,0.14), -3px 0 0 var(--accent)";
        el.style.borderBottomColor = "var(--accent-border)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.transform = "";
        el.style.boxShadow = "";
        el.style.borderBottomColor = isLast ? "transparent" : "var(--border)";
      }}
    >
      {/* Avatar */}
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${b.name} logo`}
          loading="lazy"
          decoding="async"
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            objectFit: "cover",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: avatarBg,
            color: avatarText,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
            letterSpacing: "0.03em",
          }}
        >
          {initials}
        </div>
      )}

      {/* Middle: name + badges + category */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "var(--text-primary)",
              lineHeight: 1.3,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {b.name}
          </span>
          {b.verified && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                fontSize: 9,
                fontWeight: 700,
                background: "#D1FAE5",
                color: "#047857",
                border: "1px solid #6EE7B7",
                borderRadius: 100,
                padding: "1px 5px",
                flexShrink: 0,
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Verified
            </span>
          )}
          {b.woman_owned && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                background: "var(--color-woman-owned-bg)",
                color: "var(--color-woman-owned-text)",
                border: "1px solid #F9A8D4",
                borderRadius: 100,
                padding: "1px 5px",
                flexShrink: 0,
              }}
            >
              Woman-Owned
            </span>
          )}
        </div>

        {b.category && (
          <span
            style={{
              display: "inline-block",
              marginTop: 3,
              fontSize: 11,
              fontWeight: 600,
              background: "#FDF6E3",
              color: "#8B6914",
              border: "1px solid rgba(201,168,76,0.25)",
              borderRadius: 100,
              padding: "1px 6px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {formatCategory(b.category)}
          </span>
        )}
      </div>

      {/* Right: distance + open status + chevron */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 3,
          flexShrink: 0,
        }}
      >
        {dist != null && (
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            {formatDistance(dist)}
          </span>
        )}
        {openStatus?.isOpen && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: "#047857",
            }}
          >
            Open now
          </span>
        )}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: "var(--accent)" }}
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </a>
  );
}

import BusinessAvatar from "./BusinessAvatar";
import { getOpenStatus } from "../lib/hours";
import type { Business } from "../lib/types";

function formatCategory(slug: string | null | undefined): string {
  if (!slug) return "";
  if (slug === "nonprofit") return "Community";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

type Props = {
  business: Business;
  distanceMeters?: number | null;
  bottomOffset: number;
  isDesktop?: boolean;
  onClose: () => void;
};

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? "";

function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  return miles < 0.1 ? "Nearby" : `${miles.toFixed(1)} mi`;
}

function getDirectionsUrl(b: Business): string {
  const lat = b.latitude;
  const lng = b.longitude;
  const query = encodeURIComponent(
    [b.name, b.address, b.city, b.state].filter(Boolean).join(" ")
  );

  // Detect iOS/iPadOS — prefer Apple Maps on Apple devices
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/.test(ua);

  if (lat && lng) {
    if (isIOS) return `maps://maps.apple.com/?daddr=${lat},${lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  // Fallback: text search
  if (isIOS) return `maps://maps.apple.com/?q=${query}`;
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function locationLabel(b: Business): string | null {
  const type = b.business_type;
  if (type === "online_only") return null;
  if (type === "service_based") {
    if (b.service_area) return `Serves ${b.service_area}`;
    return b.public_location_label ?? null;
  }
  if (b.is_address_public === false) return b.public_location_label ?? null;
  const parts = [b.address, b.city, b.state].filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

export default function BusinessMiniCard({
  business: b,
  distanceMeters,
  bottomOffset,
  isDesktop = false,
  onClose,
}: Props) {
  const openStatus = getOpenStatus(b.hours);
  const logoUrl = b.logo_path
    ? `${SUPABASE_URL}/storage/v1/object/public/business-logos/${b.logo_path}`
    : b.logo_url ?? null;

  const isServiceBased = b.business_type === "service_based";
  const isOnline = b.business_type === "online_only";
  const loc = locationLabel(b);

  const handleShare = async () => {
    const url = `${window.location.origin}/businesses/${b.id}`;
    if (navigator.share) {
      try { await navigator.share({ title: b.name, url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); } catch {}
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: bottomOffset + 8,
        left: 12,
        // Mobile: full-width; Desktop: anchored left, fixed width
        ...(isDesktop ? { width: 308 } : { right: 12 }),
        zIndex: 30,
        background: "var(--bg-secondary)",
        borderRadius: 20,
        border: "1px solid var(--border-mid)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
        padding: "14px 14px 12px",
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        style={{
          position: "absolute", top: 10, right: 10,
          width: 28, height: 28, borderRadius: "50%",
          border: "1px solid var(--border-mid)",
          background: "var(--bg-primary)",
          color: "var(--text-secondary)",
          cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Card body — tappable to detail page */}
      <a
        href={`/businesses/${b.id}`}
        style={{ display: "flex", gap: 12, alignItems: "flex-start", textDecoration: "none", color: "inherit", paddingRight: 28 }}
      >
        <BusinessAvatar logoUrl={logoUrl} name={b.name} size="md" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", lineHeight: 1.3 }}>
            {b.name}
          </div>
          {b.category && (
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--purple)", textTransform: "capitalize", marginTop: 2 }}>
              {formatCategory(b.category)}
            </div>
          )}

          {/* Verified + Woman-Owned badges */}
          {(b.verified || b.woman_owned) && (
            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
              {b.verified && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: "#D1FAE5", color: "#047857",
                  border: "1px solid #6EE7B7",
                  borderRadius: 100, padding: "1px 6px",
                }}>
                  Verified
                </span>
              )}
              {b.woman_owned && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: "var(--color-woman-owned-bg)",
                  color: "var(--color-woman-owned-text)",
                  border: "1px solid #F9A8D4",
                  borderRadius: 100, padding: "1px 6px",
                }}>
                  Woman-Owned
                </span>
              )}
            </div>
          )}

          {/* Distance + open status */}
          <div style={{ display: "flex", gap: 8, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
            {distanceMeters != null && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {formatDistance(distanceMeters)}
              </span>
            )}
            {b.hours && (
              <span style={{ fontSize: 11, fontWeight: 600, color: openStatus.isOpen ? "#047857" : "var(--text-muted)" }}>
                {openStatus.label}
              </span>
            )}
          </div>

          {/* Location label */}
          {loc && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
              {loc}
            </div>
          )}
        </div>
      </a>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {/* Primary geo/web action */}
        {isOnline
          ? b.website && <ActionBtn href={b.website} label="Website" icon={<GlobeIcon />} />
          : !isServiceBased && <ActionBtn href={getDirectionsUrl(b)} label="Directions" icon={<DirectionsIcon />} />
        }

        {b.phone && (
          <ActionBtn href={`tel:${b.phone}`} label="Call" icon={<PhoneIcon />} />
        )}
        <ActionBtn label="Save" icon={<HeartIcon />} onClick={() => {}} />
        <ActionBtn label="Share" icon={<ShareIcon />} onClick={handleShare} />
      </div>
    </div>
  );
}

// ─── ActionBtn ────────────────────────────────────────────────────────────────
function ActionBtn({
  href,
  label,
  icon,
  onClick,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  const s: React.CSSProperties = {
    flex: 1,
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "8px 4px",
    borderRadius: 12,
    border: "1px solid var(--border)",
    background: "var(--bg-primary)",
    cursor: "pointer",
    color: "var(--text-secondary)",
    fontSize: 10, fontWeight: 600,
    textDecoration: "none",
  };
  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer" style={s}>{icon}{label}</a>;
  }
  return <button type="button" onClick={onClick} style={s}>{icon}{label}</button>;
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function DirectionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z"/>
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}

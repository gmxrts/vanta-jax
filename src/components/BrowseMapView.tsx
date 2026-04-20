import { useEffect, useRef } from "react";

type BusinessPin = {
  id: string;
  name: string;
  category: string;
  business_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  woman_owned?: boolean | null;
};

type Props = {
  businesses: BusinessPin[];
  token: string;
};

const JAX_CENTER: [number, number] = [-81.6557, 30.3322];

export default function BrowseMapView({ businesses, token }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    // Only show pins for businesses with coordinates (online_only gets no pin)
    const pinnable = businesses.filter(
      (b) =>
        b.business_type !== "online_only" &&
        b.latitude != null &&
        b.longitude != null
    );

    function initMap() {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !containerRef.current || mapRef.current) return;

      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: JAX_CENTER,
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.AttributionControl({ compact: true }));
      mapRef.current = map;

      pinnable.forEach((b) => {
        const popup = new mapboxgl.Popup({
          offset: 28,
          closeButton: false,
          maxWidth: "200px",
        }).setHTML(
          `<a href="/businesses/${b.id}" style="display:block;padding:10px 12px;text-decoration:none;color:inherit;">` +
            `<strong style="font-size:13px;color:#0f172a;display:block;line-height:1.3;">${escapeHtml(b.name)}</strong>` +
            (b.category
              ? `<span style="font-size:11px;color:#7c3aed;text-transform:capitalize;margin-top:2px;display:block;">${escapeHtml(b.category)}</span>`
              : "") +
            (b.woman_owned
              ? `<span style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;background:#F472B6;color:#6B0035;border-radius:999px;padding:1px 7px;display:inline-block;margin-top:4px;">Woman-Owned</span>`
              : "") +
            `<span style="font-size:11px;color:#64748b;margin-top:4px;display:block;">View profile →</span>` +
            `</a>`
        );

        new mapboxgl.Marker({ color: "#C9A84C" })
          .setLngLat([b.longitude!, b.latitude!])
          .setPopup(popup)
          .addTo(map);
      });
    }

    if ((window as any).mapboxgl) {
      initMap();
    } else {
      if (!document.querySelector('link[href*="mapbox-gl"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href =
          "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
        document.head.appendChild(css);
      }

      const script = document.createElement("script");
      script.src =
        "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const pinnableCount = businesses.filter(
    (b) =>
      b.business_type !== "online_only" &&
      b.latitude != null &&
      b.longitude != null
  ).length;

  return (
    <div className="w-full space-y-3">
      <div
        ref={containerRef}
        style={{
          height: "520px",
          width: "100%",
          borderRadius: "20px",
          overflow: "hidden",
          border: "1px solid rgba(226,232,240,0.7)",
          boxShadow: "0 18px 48px -40px rgba(2,6,23,0.5)",
        }}
      />
      {pinnableCount > 0 && (
        <p className="text-[11px] text-slate-500 text-center">
          Showing {pinnableCount} location
          {pinnableCount === 1 ? "" : "s"} — online-only businesses are not
          pinned
        </p>
      )}
    </div>
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

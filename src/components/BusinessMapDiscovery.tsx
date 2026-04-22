import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { getCategories } from "../lib/categories";
import { requestUserLocation, getBusinessesNearby } from "../lib/geo";
import { getOpenStatus } from "../lib/hours";
import BusinessMiniCard from "./BusinessMiniCard";
import type { Business } from "../lib/types";
import type { Category } from "../lib/types";

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN ?? "";
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
const JAX_CENTER: [number, number] = [-81.6557, 30.3322];
const SNAP_HANDLE = 80;
const SNAP_PEEK = 260;
const SNAP_FULL_OFFSET = 80;

type MapStyleKey = "light" | "dark" | "satellite";
type UserCoords = { lat: number; lng: number };

const MAP_STYLES: Record<MapStyleKey, { url: string; label: string }> = {
  light: { url: "mapbox://styles/mapbox/light-v11", label: "Default" },
  dark: { url: "mapbox://styles/mapbox/dark-v11", label: "Dark" },
  satellite: { url: "mapbox://styles/mapbox/satellite-streets-v12", label: "Satellite" },
};

function readSavedStyle(): MapStyleKey {
  try {
    const s = localStorage.getItem("vj-map-style");
    if (s === "dark" || s === "satellite") return s;
  } catch {}
  return "light";
}

function getSnapFull() {
  return typeof window !== "undefined" ? window.innerHeight - SNAP_FULL_OFFSET : 500;
}

function nearestSnap(h: number): number {
  const full = getSnapFull();
  return [SNAP_HANDLE, SNAP_PEEK, full].reduce((prev, cur) =>
    Math.abs(cur - h) < Math.abs(prev - h) ? cur : prev
  );
}

function passesFilter(b: Business, activeCategory: string, searchQuery: string): boolean {
  if (activeCategory && b.category !== activeCategory) return false;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      (b.category ?? "").toLowerCase().includes(q) ||
      (b.description ?? "").toLowerCase().includes(q)
    );
  }
  return true;
}

function formatCategory(slug: string | null | undefined): string {
  if (!slug) return "";
  if (slug === "nonprofit") return "Community";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

function logoSrc(b: Business): string | null {
  if (b.logo_path) return `${SUPABASE_URL}/storage/v1/object/public/business-logos/${b.logo_path}`;
  return b.logo_url ?? null;
}

export default function BusinessMapDiscovery() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const userCoordsRef = useRef<UserCoords | null>(null);
  const businessFeaturesRef = useRef<any[]>([]);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userCoords, setUserCoords] = useState<UserCoords | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mapStyle, setMapStyle] = useState<MapStyleKey>(() => readSavedStyle());
  const [syncKey, setSyncKey] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState({ location: false, service: false, online: false });

  const toggleSection = useCallback((key: "location" | "service" | "online") => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const dragStartTime = useRef(0);
  const isDragging = useRef(false);

  // ── Mobile detection ──────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Resize map when layout switches between mobile/desktop ────────────────
  useEffect(() => {
    if (mapRef.current) mapRef.current.resize();
  }, [isMobile]);

  // ── Scroll selected card into view when selectedBusiness changes ──────────
  useEffect(() => {
    if (!selectedBusiness) return;
    const el = document.querySelector<HTMLElement>(`[data-business-id="${selectedBusiness.id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedBusiness?.id]);

  // ── Load businesses + categories ──────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const [{ data, error }, cats] = await Promise.all([
          supabase
            .from("businesses")
            .select("*")
            .not("is_archived", "is", true)
            .order("name", { ascending: true }),
          getCategories(),
        ]);
        if (!error && data) setBusinesses(data as Business[]);
        setCategories(cats);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // ── Geolocation on mount ──────────────────────────────────────────────────
  useEffect(() => {
    requestUserLocation()
      .then(async (coords) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setUserCoords(loc);
        userCoordsRef.current = loc;

        try {
          const nearby = await getBusinessesNearby(loc.lat, loc.lng, "Jacksonville");
          if (nearby.length > 0) setBusinesses(nearby);
        } catch {}

        const map = mapRef.current;
        if (map) {
          map.flyTo({ center: [loc.lng, loc.lat], zoom: 13, duration: 1200 });
          if (map.isStyleLoaded()) addUserDot(map, loc);
          else map.once("style.load", () => addUserDot(map, loc));
        }
      })
      .catch(() => {});
  }, []);

  // ── setupMapLayers: adds cluster source + layers + user dot ───────────────
  const setupMapLayers = useCallback((map: any) => {
    map.addSource("businesses-cluster", {
      type: "geojson",
      data: { type: "FeatureCollection", features: businessFeaturesRef.current },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "businesses-cluster",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#C9A84C",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 24, 30, 30],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "businesses-cluster",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: { "text-color": "#0E0C0A" },
    });

    if (userCoordsRef.current) {
      addUserDot(map, userCoordsRef.current);
    }
  }, []);

  // ── Init Mapbox ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !MAPBOX_TOKEN) return;
    let resizeObserver: ResizeObserver | null = null;

    function initMap() {
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl || !mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = MAPBOX_TOKEN;
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: MAP_STYLES[readSavedStyle()].url,
        center: JAX_CENTER,
        zoom: 11,
        attributionControl: false,
        fadeDuration: 0,
      });

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      mapRef.current = map;

      requestAnimationFrame(() => { map.resize(); });

      if (typeof ResizeObserver !== "undefined" && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => { map.resize(); });
        resizeObserver.observe(mapContainerRef.current);
      }

      map.on("load", () => {
        setupMapLayers(map);

        // Cluster click → zoom in (registered once; survives style switches because
        // map.on binds to the map object, not the layer)
        map.on("click", "clusters", (e: any) => {
          const features = map.queryRenderedFeatures(e.point, { layers: ["clusters"] });
          if (!features.length) return;
          const clusterId = features[0].properties.cluster_id;
          (map.getSource("businesses-cluster") as any).getClusterExpansionZoom(
            clusterId,
            (err: any, zoom: number) => {
              if (err) return;
              map.easeTo({ center: features[0].geometry.coordinates, zoom });
            }
          );
        });

        map.on("mouseenter", "clusters", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "clusters", () => { map.getCanvas().style.cursor = ""; });
      });
    }

    if ((window as any).mapboxgl) {
      initMap();
    } else {
      if (!document.querySelector('link[href*="mapbox-gl"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css";
        document.head.appendChild(css);
      }
      const script = document.createElement("script");
      script.src = "https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed lists ─────────────────────────────────────────────────────────

  // Businesses that appear in the sidebar/sheet list (all non-online-only)
  const listBusinesses = useMemo(
    () =>
      businesses.filter(
        (b) => b.business_type !== "online_only" && passesFilter(b, activeCategory, searchQuery)
      ),
    [businesses, activeCategory, searchQuery]
  );

  // Subset of listBusinesses that have coordinates → get map pins
  const pinnableBusinesses = useMemo(
    () => listBusinesses.filter((b) => b.latitude != null && b.longitude != null),
    [listBusinesses]
  );

  const onlineBusinesses = useMemo(
    () =>
      businesses.filter(
        (b) => b.business_type === "online_only" && passesFilter(b, activeCategory, searchQuery)
      ),
    [businesses, activeCategory, searchQuery]
  );

  // Keep features ref current for use in setupMapLayers after style switch
  useEffect(() => {
    businessFeaturesRef.current = pinnableBusinesses.map((b) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [b.longitude!, b.latitude!] },
      properties: { id: b.id, business_type: b.business_type ?? "brick_and_mortar" },
    }));
  }, [pinnableBusinesses]);

  // ── Sync pins to map ───────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const mapboxgl = (window as any).mapboxgl;
    if (!mapboxgl) return;

    const trySync = () => {
      if (!map.isStyleLoaded()) {
        map.once("idle", trySync);
        return;
      }

      // Remove old HTML markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      // Update cluster GeoJSON source
      const src = map.getSource("businesses-cluster") as any;
      if (src) {
        src.setData({ type: "FeatureCollection", features: businessFeaturesRef.current });
      }

      // Add HTML markers per business (only pinnable ones have coordinates)
      pinnableBusinesses.forEach((b) => {
        const isSelected = selectedBusiness?.id === b.id;
        const isService = b.business_type === "service_based";
        const size = isSelected ? 22 : 16;
        const el = document.createElement("div");

        if (isService) {
          // Circle outline = service-based
          el.style.cssText = `
            width:${size}px;height:${size}px;
            background:${isSelected ? "var(--text-primary)" : "transparent"};
            border:3px solid var(--accent);
            border-radius:50%;
            cursor:pointer;
            box-shadow:0 0 0 2px white;
            transition:all 0.15s ease;
          `;
        } else {
          // Teardrop = brick_and_mortar
          el.style.cssText = `
            width:${size}px;height:${size}px;
            background:${isSelected ? "var(--text-primary)" : "var(--accent)"};
            border:2px solid ${isSelected ? "var(--accent)" : "white"};
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            cursor:pointer;
            transition:all 0.15s ease;
          `;
        }

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedBusiness(b);
          map.easeTo({ center: [b.longitude!, b.latitude!], offset: [0, -60] });
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([b.longitude!, b.latitude!])
          .addTo(map);

        markersRef.current.set(b.id, marker);
      });
    };

    trySync();
  }, [pinnableBusinesses, selectedBusiness?.id, syncKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Style switcher ─────────────────────────────────────────────────────────
  const handleStyleChange = useCallback(
    (styleKey: MapStyleKey) => {
      if (styleKey === mapStyle) return;
      setMapStyle(styleKey);
      try { localStorage.setItem("vj-map-style", styleKey); } catch {}

      const map = mapRef.current;
      if (!map) return;

      // Clear HTML markers; they survive setStyle() but need re-adding after
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();

      map.setStyle(MAP_STYLES[styleKey].url);

      map.once("style.load", () => {
        setupMapLayers(map);
        setSyncKey((k) => k + 1);
      });
    },
    [mapStyle, setupMapLayers]
  );

  // ── My Location ────────────────────────────────────────────────────────────
  const handleMyLocation = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userCoords) {
      map.flyTo({ center: [userCoords.lng, userCoords.lat], zoom: 14, duration: 1200 });
    } else {
      requestUserLocation()
        .then((coords) => {
          const loc = { lat: coords.latitude, lng: coords.longitude };
          setUserCoords(loc);
          userCoordsRef.current = loc;
          map.flyTo({ center: [loc.lng, loc.lat], zoom: 14, duration: 1200 });
          if (map.isStyleLoaded()) addUserDot(map, loc);
        })
        .catch(() => {});
    }
  }, [userCoords]);

  // ── Touch drag (bottom sheet) ──────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY;
    dragStartH.current = sheetHeight;
    dragStartTime.current = Date.now();
    isDragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = dragStartY.current - e.touches[0].clientY;
    setSheetHeight(Math.max(SNAP_HANDLE, Math.min(getSnapFull(), dragStartH.current + delta)));
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = dragStartY.current - e.changedTouches[0].clientY;
    const velocity = delta / (Date.now() - dragStartTime.current);
    let target: number;
    if (Math.abs(velocity) > 0.3) {
      const full = getSnapFull();
      target = velocity > 0
        ? (sheetHeight > SNAP_PEEK ? full : SNAP_PEEK)
        : (sheetHeight < SNAP_PEEK ? SNAP_HANDLE : SNAP_PEEK);
    } else {
      target = nearestSnap(sheetHeight);
    }
    setSheetHeight(target);
  };

  // ── Sorted display list ────────────────────────────────────────────────────
  const displayList = useMemo(
    () =>
      [...listBusinesses].sort((a, b) => {
        if (userCoords) {
          return ((a as any).dist_meters ?? Infinity) - ((b as any).dist_meters ?? Infinity);
        }
        return a.name.localeCompare(b.name);
      }),
    [listBusinesses, userCoords]
  );

  const locationList = useMemo(
    () => displayList.filter((b) => b.business_type !== "service_based"),
    [displayList]
  );

  const serviceList = useMemo(
    () => displayList.filter((b) => b.business_type === "service_based"),
    [displayList]
  );

  const sheetHeaderText = (() => {
    const main = userCoords
      ? `${listBusinesses.length} places nearby · sorted by distance`
      : `${listBusinesses.length} businesses`;
    return onlineBusinesses.length > 0 ? `${main} · ${onlineBusinesses.length} online` : main;
  })();

  const listBottomOffset = isMobile ? sheetHeight : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="vj-map-layout" style={{ position: "relative" }}>

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <aside style={{
          width: 320, flexShrink: 0,
          display: "flex", flexDirection: "column",
          borderRight: "1px solid var(--border-mid)",
          background: "var(--bg-secondary)",
          overflow: "hidden",
        }}>
          <>
            <div style={{ padding: "16px 12px 0" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 10 }}>
                {isLoading ? "Loading…" : sheetHeaderText}
              </div>
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
                <CategoryPills categories={categories} active={activeCategory} onSelect={setActiveCategory} />
              </div>
              <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8, marginTop: 8 }}>
                {locationList.length > 0 && (
                  <>
                    <SectionHeader
                      title="In Jacksonville"
                      count={locationList.length}
                      collapsed={collapsedSections.location}
                      onToggle={() => toggleSection("location")}
                    />
                    {!collapsedSections.location && (
                      <div style={{ padding: "0 8px" }}>
                        {locationList.map((b) => (
                          <BusinessListRow
                            key={b.id} business={b}
                            isSelected={selectedBusiness?.id === b.id}
                            hasLocation={!!userCoords}
                            onSelect={(biz) => {
                              setSelectedBusiness(biz);
                              if (mapRef.current && biz.latitude && biz.longitude) {
                                mapRef.current.easeTo({ center: [biz.longitude, biz.latitude], zoom: 15 });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {serviceList.length > 0 && (
                  <>
                    <SectionHeader
                      title="Mobile & Service"
                      count={serviceList.length}
                      collapsed={collapsedSections.service}
                      onToggle={() => toggleSection("service")}
                    />
                    {!collapsedSections.service && (
                      <div style={{ padding: "0 8px" }}>
                        {serviceList.map((b) => (
                          <BusinessListRow
                            key={b.id} business={b}
                            isSelected={selectedBusiness?.id === b.id}
                            hasLocation={!!userCoords}
                            onSelect={(biz) => {
                              setSelectedBusiness(biz);
                              if (mapRef.current && biz.latitude && biz.longitude) {
                                mapRef.current.easeTo({ center: [biz.longitude, biz.latitude], zoom: 15 });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {onlineBusinesses.length > 0 && (
                  <>
                    <SectionHeader
                      title="Online Only"
                      count={onlineBusinesses.length}
                      collapsed={collapsedSections.online}
                      onToggle={() => toggleSection("online")}
                    />
                    {!collapsedSections.online && (
                      <div style={{ padding: "0 8px" }}>
                        {onlineBusinesses.map((b) => (
                          <BusinessListRow
                            key={b.id} business={b}
                            isSelected={selectedBusiness?.id === b.id}
                            hasLocation={false}
                            onSelect={(biz) => setSelectedBusiness(biz)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!isLoading && locationList.length === 0 && serviceList.length === 0 && onlineBusinesses.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 24 }}>
                    No businesses found.{" "}
                    <a href="/suggest-business" style={{ color: "var(--accent)" }}>Suggest one</a>
                  </p>
                )}
              </div>
          </>
        </aside>
      )}

      {/* ── Map area ── */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

        {/* Mobile: floating search + pills */}
        {isMobile && (
          <div style={{
            position: "absolute", top: 12, left: 12, right: 12, zIndex: 20,
            display: "flex", flexDirection: "column", gap: 8,
          }}>
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <CategoryPills categories={categories} active={activeCategory} onSelect={setActiveCategory} />
          </div>
        )}

        {/* Style switcher — bottom-left */}
        <MapStyleSwitcher
          current={mapStyle}
          onChange={handleStyleChange}
          bottom={isMobile ? sheetHeight + 12 : 12}
        />

        {/* My Location — bottom-right */}
        <button
          onClick={handleMyLocation}
          aria-label="My location"
          style={{
            position: "absolute",
            bottom: isMobile ? sheetHeight + 12 : 12,
            right: 12,
            zIndex: 20,
            width: 44, height: 44,
            borderRadius: "50%",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-mid)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: userCoords ? "var(--accent)" : "var(--text-secondary)",
            transition: "bottom 0.3s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" opacity="0.4"/>
          </svg>
        </button>

        {/* BusinessMiniCard */}
        {selectedBusiness && (
          <BusinessMiniCard
            business={selectedBusiness}
            distanceMeters={(selectedBusiness as any).dist_meters ?? null}
            bottomOffset={listBottomOffset}
            isDesktop={!isMobile}
            onClose={() => setSelectedBusiness(null)}
          />
        )}

        {/* ── Mobile bottom sheet ── */}
        {isMobile && (
          <div
            ref={sheetRef}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 25,
              height: sheetHeight,
              background: "var(--bg-secondary)",
              borderRadius: "20px 20px 0 0",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.12)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              transition: isDragging.current ? "none" : "height 0.3s cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            {/* Drag handle — touch handlers here only so list scrolling works freely */}
            <div
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                flexShrink: 0, display: "flex", flexDirection: "column",
                alignItems: "center", padding: "10px 0 6px", cursor: "grab",
                touchAction: "none",
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border-mid)" }} />
              {sheetHeight > SNAP_HANDLE + 20 && (
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, fontWeight: 500 }}>
                  {isLoading ? "Loading…" : sheetHeaderText}
                </div>
              )}
            </div>

            {sheetHeight > SNAP_HANDLE + 20 && (
              <div style={{ flex: 1, overflowY: "auto", paddingBottom: 12 }}>
                {locationList.length > 0 && (
                  <>
                    <SectionHeader
                      title="In Jacksonville"
                      count={locationList.length}
                      collapsed={collapsedSections.location}
                      onToggle={() => toggleSection("location")}
                    />
                    {!collapsedSections.location && (
                      <div style={{ padding: "0 8px" }}>
                        {locationList.map((b) => (
                          <BusinessListRow
                            key={b.id} business={b}
                            isSelected={selectedBusiness?.id === b.id}
                            hasLocation={!!userCoords}
                            onSelect={(biz) => {
                              setSelectedBusiness(biz);
                              setSheetHeight(SNAP_PEEK);
                              if (mapRef.current && biz.latitude && biz.longitude) {
                                mapRef.current.easeTo({ center: [biz.longitude, biz.latitude], zoom: 15 });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {serviceList.length > 0 && (
                  <>
                    <SectionHeader
                      title="Mobile & Service"
                      count={serviceList.length}
                      collapsed={collapsedSections.service}
                      onToggle={() => toggleSection("service")}
                    />
                    {!collapsedSections.service && (
                      <div style={{ padding: "0 8px" }}>
                        {serviceList.map((b) => (
                          <BusinessListRow
                            key={b.id} business={b}
                            isSelected={selectedBusiness?.id === b.id}
                            hasLocation={!!userCoords}
                            onSelect={(biz) => {
                              setSelectedBusiness(biz);
                              setSheetHeight(SNAP_PEEK);
                              if (mapRef.current && biz.latitude && biz.longitude) {
                                mapRef.current.easeTo({ center: [biz.longitude, biz.latitude], zoom: 15 });
                              }
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {onlineBusinesses.length > 0 && (
                  <>
                    <SectionHeader
                      title="Online Only"
                      count={onlineBusinesses.length}
                      collapsed={collapsedSections.online}
                      onToggle={() => toggleSection("online")}
                    />
                    {!collapsedSections.online && (
                      <div style={{ padding: "0 8px" }}>
                        {onlineBusinesses.map((b) => (
                          <BusinessListRow
                            key={b.id} business={b}
                            isSelected={selectedBusiness?.id === b.id}
                            hasLocation={false}
                            onSelect={(biz) => {
                              setSelectedBusiness(biz);
                              setSheetHeight(SNAP_PEEK);
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!isLoading && locationList.length === 0 && serviceList.length === 0 && onlineBusinesses.length === 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 16 }}>
                    No businesses found.{" "}
                    <a href="/suggest-business" style={{ color: "var(--accent)" }}>Suggest one</a>
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── addUserDot ───────────────────────────────────────────────────────────────
function addUserDot(map: any, coords: UserCoords) {
  const id = "user-location";
  const data = {
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [coords.lng, coords.lat] },
    properties: {},
  };

  if (map.getSource(id)) {
    (map.getSource(id) as any).setData(data);
    return;
  }

  map.addSource(id, { type: "geojson", data });

  map.addLayer({
    id: "user-dot-halo",
    type: "circle",
    source: id,
    paint: {
      "circle-radius": 16,
      "circle-color": "rgba(74,144,217,0.15)",
      "circle-stroke-width": 0,
    },
  });

  map.addLayer({
    id: "user-dot",
    type: "circle",
    source: id,
    paint: {
      "circle-radius": 8,
      "circle-color": "#4A90D9",
      "circle-stroke-width": 3,
      "circle-stroke-color": "#fff",
    },
  });
}

// ─── MapStyleSwitcher ─────────────────────────────────────────────────────────
function MapStyleSwitcher({
  current,
  onChange,
  bottom,
}: {
  current: MapStyleKey;
  onChange: (key: MapStyleKey) => void;
  bottom: number;
}) {
  return (
    <div
      style={{
        position: "absolute",
        bottom,
        left: 12,
        zIndex: 20,
        display: "flex",
        borderRadius: 100,
        overflow: "hidden",
        border: "1px solid var(--border-mid)",
        background: "var(--bg-secondary)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        transition: "bottom 0.3s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      {(["light", "dark", "satellite"] as MapStyleKey[]).map((key, i) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: "7px 11px",
            fontSize: 11,
            fontWeight: 600,
            background: current === key ? "var(--accent)" : "transparent",
            color: current === key ? "#0E0C0A" : "var(--text-secondary)",
            border: "none",
            borderRight: i < 2 ? "1px solid var(--border)" : "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {MAP_STYLES[key].label}
        </button>
      ))}
    </div>
  );
}

// ─── SearchBar ────────────────────────────────────────────────────────────────
function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{
      position: "relative",
      background: "var(--bg-secondary)",
      borderRadius: 100,
      boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      border: "1px solid var(--border-mid)",
    }}>
      <svg
        style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-muted)" }}
        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        type="text"
        placeholder="Search businesses…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "11px 40px 11px 38px",
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: 14,
          color: "var(--text-primary)",
          borderRadius: 100,
        }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer",
            color: "var(--text-muted)", padding: 4, fontSize: 16, lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}

// ─── CategoryPills ────────────────────────────────────────────────────────────
function CategoryPills({
  categories,
  active,
  onSelect,
}: {
  categories: Category[];
  active: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2, marginTop: 8 }}>
      {[{ slug: "", label: "All" }, ...categories].map((c) => {
        const isActive = active === c.slug;
        return (
          <button
            key={c.slug}
            type="button"
            onClick={() => onSelect(isActive ? "" : c.slug)}
            style={{
              flexShrink: 0,
              padding: "5px 12px",
              borderRadius: 100,
              border: isActive ? "1px solid var(--accent)" : "1px solid var(--border-mid)",
              background: isActive ? "var(--accent)" : "var(--bg-secondary)",
              color: isActive ? "#0E0C0A" : "var(--text-secondary)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({
  title, count, collapsed, onToggle,
}: {
  title: string; count: number; collapsed: boolean; onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        display: "flex", alignItems: "center", width: "100%",
        padding: "8px 14px 6px", background: "none", border: "none",
        borderBottom: "1px solid var(--border-mid)", cursor: "pointer", gap: 6,
        marginTop: 4,
      }}
    >
      <span style={{
        flex: 1, fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--text-muted)", textAlign: "left",
      }}>
        {title}
        <span style={{ fontWeight: 500, marginLeft: 5, opacity: 0.7 }}>({count})</span>
      </span>
      <svg
        width="12" height="12" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{
          color: "var(--text-muted)", flexShrink: 0, transition: "transform 0.2s",
          transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
        }}
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

// ─── BusinessListRow ──────────────────────────────────────────────────────────
function BusinessListRow({
  business: b,
  isSelected,
  hasLocation,
  onSelect,
}: {
  business: Business;
  isSelected: boolean;
  hasLocation: boolean;
  onSelect: (b: Business) => void;
}) {
  const dist = (b as any).dist_meters;
  const miles = dist != null && hasLocation ? `${(dist / 1609.34).toFixed(1)} mi` : null;
  const openStatus = b.hours ? getOpenStatus(b.hours) : null;
  const isService = b.business_type === "service_based";

  return (
    <button
      type="button"
      onClick={() => onSelect(b)}
      data-business-id={b.id}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "10px 8px",
        borderRadius: 12, border: "none",
        background: isSelected ? "var(--accent-pale)" : "transparent",
        borderLeft: isSelected ? "2.5px solid var(--accent, #C9A84C)" : "none",
        cursor: "pointer", textAlign: "left",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 40, height: 40, borderRadius: 10, background: "var(--border)",
        overflow: "hidden", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
      }}>
        {logoSrc(b) ? (
          <img src={logoSrc(b)!} alt="" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 4 }} />
        ) : (
          b.name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")
        )}
      </div>

      {/* Text */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {b.name}
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {formatCategory(b.category)}
          </span>
          {isService && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--border)", borderRadius: 4, padding: "1px 4px", fontWeight: 600 }}>
              Mobile
            </span>
          )}
          {b.business_type === "online_only" && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", background: "var(--border)", borderRadius: 4, padding: "1px 4px", fontWeight: 600 }}>
              Online
            </span>
          )}
          {miles && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{miles}</span>
          )}
          {openStatus && (
            openStatus.isOpen ? (
              <span style={{
                fontSize: 11, fontWeight: 600,
                background: "var(--color-success-bg, #D1FAE5)",
                color: "var(--color-success-text, #047857)",
                borderRadius: 10,
                padding: "2px 8px",
              }}>
                Open
              </span>
            ) : (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Closed
              </span>
            )
          )}
        </div>
      </div>

      {isSelected && (
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
      )}
    </button>
  );
}


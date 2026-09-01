"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Protocol } from "pmtiles";
import type { CityConfig } from "@startup-atlas/config";
import type { BrandListItem } from "@startup-atlas/db";
import { getStyle } from "@/lib/map/style";
import { colorFor } from "@/lib/avatarColor";

const PRECISE = new Set(["exact", "building", "street"]);
const SOURCE_ID = "brands";

// Registered once per page load, not per map instance — MapLibre's protocol
// registry is global, and re-registering on every mount/unmount is harmless
// but unnecessary.
let pmtilesRegistered = false;
function ensurePmtilesProtocol() {
  if (pmtilesRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesRegistered = true;
}

// Deterministic pseudo-random in [0,1), seeded by a string — same brand
// always gets the same "random" offset on every render (no jumping around
// between renders/filter changes), without needing to persist anything.
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return ((h >>> 0) % 100000) / 100000;
}

// Any two brands geocoded to the same fallback point — a shared city
// centroid (synthetic/city precision), or just two companies in the same
// named business park (area/locality precision, e.g. two tenants of the
// same BKC tower) — end up with *identical* coordinates. A cluster of
// identical points can never visually separate at any zoom, because
// there's nowhere to zoom "into": this is what caused a "7" cluster to
// expand and reveal only one clickable pin underneath. This groups brands
// by exact coordinate and scatters every group of 2+ at a random-looking
// (but deterministic) position within a small disc around their shared
// point — an evenly-spaced ring was the first approach here, but pins
// landing in a perfect circle reads as obviously synthetic, which is the
// opposite of what this product is trying to signal. It never changes what
// precision is shown for any brand; the badge and profile page still say
// exactly what they said before, honestly. Two disc sizes: a wide one for
// synthetic/city groups (we don't know the neighborhood at all, so a
// visibly bigger spread doesn't overclaim anything) and a tight one for
// area/locality groups (we know the real neighborhood, they're genuinely
// that close together — just spread enough to click individually).
function spreadOverlaps(
  brands: BrandListItem[],
): Map<string, [number, number]> {
  const groups = new Map<string, BrandListItem[]>();
  for (const b of brands) {
    if (b.lat == null || b.lng == null) continue;
    const key = `${b.lat.toFixed(5)},${b.lng.toFixed(5)}`;
    const list = groups.get(key);
    if (list) list.push(b);
    else groups.set(key, [b]);
  }

  const coordsById = new Map<string, [number, number]>();
  for (const group of groups.values()) {
    const [{ lat, lng, precision }] = group as [BrandListItem];
    if (group.length === 1) {
      coordsById.set(group[0].id, [lng as number, lat as number]);
      continue;
    }
    const wide = precision === "synthetic" || precision === "city";
    const baseRadius = wide ? 0.01 : 0.0035; // ~1.1km vs ~390m at this latitude
    const maxRadius =
      baseRadius + Math.min(group.length, 12) * (wide ? 0.0007 : 0.0003);
    group.forEach((b) => {
      const angle = seededRandom(`${b.id}:angle`) * 2 * Math.PI;
      // sqrt of a uniform [0,1) sample spreads points evenly across the
      // disc's *area* — without it, points bunch up near the center instead
      // of filling the whole radius.
      const r = maxRadius * Math.sqrt(seededRandom(`${b.id}:radius`));
      coordsById.set(b.id, [
        (lng as number) + r * Math.cos(angle),
        (lat as number) + r * Math.sin(angle),
      ]);
    });
  }
  return coordsById;
}

// icon: set once that brand's logo has been fetched and registered with the
// map (see loadLogos below) — undefined until then, which the symbol layer
// treats as "nothing to draw," so the circle badge underneath is the only
// visible thing until a logo pops in. Never blocks the initial paint.
// iconScale: per-image scale factor so every logo renders at the same
// on-screen size regardless of its actual source resolution (a 16px
// favicon and a 512px one would otherwise look wildly different sizes).
type BrandFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    slug: string;
    name: string;
    precise: boolean;
    icon?: string;
    iconScale?: number;
    initial: string;
    avatarColor: string;
  }
>;

function toFeatureCollection(
  brands: BrandListItem[],
  icons: Map<string, { iconId: string; scale: number }>,
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const coordsById = spreadOverlaps(brands);
  return {
    type: "FeatureCollection",
    features: brands
      .filter((b) => coordsById.has(b.id))
      .map((b): BrandFeature => {
        const logo = b.logoUrl ? icons.get(b.logoUrl) : undefined;
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: coordsById.get(b.id)! },
          properties: {
            slug: b.slug,
            name: b.name,
            precise: PRECISE.has(b.precision ?? ""),
            // Same fallback identity as CompanyLogo.tsx (grid/profile views):
            // a badge colored from the name's hash, with its first letter —
            // used here whenever no logo has loaded for this pin.
            initial: b.name.charAt(0).toUpperCase(),
            avatarColor: colorFor(b.name),
            ...(logo ? { icon: logo.iconId, iconScale: logo.scale } : {}),
          },
        };
      }),
  };
}

// on-screen px — deliberately smaller than the 36px badge diameter (see the
// "points" circle layer) so the logo always reads as sitting inside the
// badge with visible padding, never poking past its edge.
const LOGO_ICON_SIZE = 22;

// Loads every unique brand logo in the background and returns a map of
// logoUrl -> {iconId, scale}, scale computed per-image from its actual
// pixel size so LOGO_ICON_SIZE is what ends up on screen regardless of
// source resolution. Fires after the map is already interactive, so a slow
// logo load never delays the map itself appearing — this is purely a
// progressive enhancement on top of the always-visible colored circle
// badge.
//
// logoUrl is always a same-origin path under /logos/ now (see
// services/pipeline/src/lib/logos.ts — fetched once at ingest time, cached
// locally, never a live third-party hotlink at render time), which is what
// lets this call map.loadImage directly with no CORS workaround: a prior
// version of this file hit an external icon host straight from the browser,
// which needed a proxy route because MapLibre's WebGL texture loader
// requires a CORS-compliant response (unlike a plain <img> tag). Self-
// hosting the bytes makes that whole problem not exist.
async function loadLogos(
  map: maplibregl.Map,
  brands: BrandListItem[],
): Promise<Map<string, { iconId: string; scale: number }>> {
  const icons = new Map<string, { iconId: string; scale: number }>();
  const uniqueUrls = [
    ...new Set(brands.map((b) => b.logoUrl).filter((u): u is string => !!u)),
  ];

  await Promise.allSettled(
    uniqueUrls.map(async (url, i) => {
      const iconId = `logo-${i}`;
      if (map.hasImage(iconId)) return; // shouldn't happen (fresh id per call), but harmless if it does
      const { data } = await map.loadImage(url);
      map.addImage(iconId, data);
      const scale = LOGO_ICON_SIZE / Math.max(data.width, data.height);
      icons.set(url, { iconId, scale });
    }),
  );

  return icons;
}

export function MapView({
  city,
  brands,
  focusArea,
}: {
  city: CityConfig;
  brands: BrandListItem[];
  focusArea?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  // Filters (via TopBar) change `brands` far more often than `city` changes —
  // the map itself is only rebuilt on city change; brand updates just patch
  // the existing GeoJSON source (see the second effect below), so panning
  // and zoom survive a filter tweak instead of resetting.
  const brandsRef = useRef(brands);
  brandsRef.current = brands;
  // CityExplorer's very first render (before any filter is applied) already
  // passes the city's full brand list, so every logo this city could ever
  // need gets attempted once here — a later filter change only narrows the
  // set, it never introduces a brand whose logo wasn't already tried.
  const iconsRef = useRef<Map<string, { iconId: string; scale: number }>>(
    new Map(),
  );
  const router = useRouter();

  useEffect(() => {
    if (!containerRef.current) return;
    ensurePmtilesProtocol();

    // Self-hosted (CLAUDE.md §2 locked decision, §15's "long pole"). In
    // production NEXT_PUBLIC_MAPTILES_URL points at the R2 (or S3) object
    // URL — set once the bucket exists (see infra/pmtiles/README.md), never
    // committed as a real value. Locally, with the var unset, it falls back
    // to the copy under public/tiles/, served by Next's own dev server.
    // Either way MapLibre reads tile byte-ranges directly out of the file
    // via the pmtiles:// protocol registered above — no tile server process.
    const pmtilesUrl = process.env.NEXT_PUBLIC_MAPTILES_URL;
    // process.env.NEXT_PUBLIC_MAPTILES_URL || `${window.location.origin}/tiles/maharashtra.pmtiles`;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyle(pmtilesUrl),
      center: [city.centerLng, city.centerLat],
      zoom: city.defaultZoom,
    });
    mapRef.current = map;
    // bottom-left, not top-right — top-right sat directly under the
    // floating TopBar (CityExplorer.tsx) and was invisible underneath it.
    // Positioned via globals.css to clear the developer-credit badge that
    // also lives in this corner (CityExplorer.tsx's fixed bottom-5 left-5).
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-left",
    );

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: toFeatureCollection(brandsRef.current, iconsRef.current),
        cluster: true,
        clusterRadius: 46,
      });

      // Two-tone bullseye, both tones pastel/light — a broad light outer
      // ring behind a smaller inner circle just a shade darker, never a
      // saturated/dark fill (green = small, amber = large). Deliberately
      // not a same-color blurred halo (an earlier version), which read as
      // a single flat blob rather than a distinct ring, and deliberately
      // not a dark inner circle either (also tried — read as too heavy).
      map.addLayer({
        id: "cluster-glow",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          // Vivid, not pale — a muted pastel version of these read as dull.
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#7ee08a",
            10,
            "#ffc266",
          ],
          // +14 (was +8) for a visibly broader ring around the inner circle.
          "circle-radius": [
            "+",
            ["step", ["get", "point_count"], 22, 10, 28, 30, 36],
            14,
          ],
          "circle-blur": 0.3,
          "circle-opacity": 0.9,
        },
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        paint: {
          // One shade darker than the ring above, still bright/saturated —
          // not a flat tiered "dark vs light" contrast, but not dull either.
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#4cc264",
            10,
            "#ff9f40",
          ],
          "circle-radius": ["step", ["get", "point_count"], 22, 10, 28, 30, 36],
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 14,
          "text-font": ["Noto Sans Regular"],
        },
        // Dark text reads better than white now that both rings are pastel.
        paint: { "text-color": "#1f2a24" },
      });

      // Neutral dark shadow underneath everything — pure contrast, no trust
      // meaning. Basemap terrain/land colors range from pale to fairly
      // saturated greens, and a colored glow alone can wash out against a
      // similarly-colored patch of map; this dark halo guarantees every pin
      // separates from the basemap no matter what's under it.
      map.addLayer({
        id: "point-shadow",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 26,
          "circle-color": "#000000",
          "circle-blur": 1.2,
          "circle-opacity": 0.22,
        },
      });

      // Soft colored glow behind each pin — green for a precise location,
      // amber for an honestly-approximate one. This is the trust signal
      // (replacing what used to be a hard dark stroke ring), plus it's what
      // gives the badge the "floating card" look instead of a flat dot.
      map.addLayer({
        id: "point-glow",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 23,
          "circle-color": ["case", ["get", "precise"], "#0c7a5e", "#d99a3e"],
          "circle-blur": 0.8,
          "circle-opacity": ["case", ["get", "precise"], 0.75, 0.6],
        },
      });

      // The white badge itself, plus a crisp colored ring (matching the
      // glow's trust color) right at its edge — the glow alone is a soft
      // blur that can fade into a busy basemap; this hard-edged stroke is
      // what actually guarantees a clean, always-visible boundary so the
      // logo sitting on top never blends into the map underneath it.
      map.addLayer({
        id: "points",
        type: "circle",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-radius": 18,
          // White once a real logo has loaded (the icon needs a neutral
          // backing), otherwise the brand's own fallback color — same
          // per-name hashed palette as CompanyLogo.tsx, so a startup with no
          // logo still reads as a distinct, identifiable badge instead of a
          // blank white dot.
          "circle-color": [
            "case",
            ["has", "icon"],
            "#ffffff",
            ["get", "avatarColor"],
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": [
            "case",
            ["get", "precise"],
            "#0c7a5e",
            "#d99a3e",
          ],
        },
      });

      // Progressive enhancement on top of the circle badge above — renders
      // nothing for a feature until its logo has loaded (see loadLogos),
      // so a slow/blocked icon host degrades to the plain colored badge,
      // never to a broken image or a blank pin. Sized well under the badge
      // (LOGO_ICON_SIZE vs. the 36px badge diameter) so it always reads as
      // "inside" the circle, never overflowing past its edge.
      map.addLayer({
        id: "point-logos",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["get", "icon"],
          // Data-driven, computed per-image in loadLogos from its actual
          // pixel size — a 16px favicon and a 512px one both end up at
          // LOGO_ICON_SIZE on screen instead of wildly different sizes.
          "icon-size": ["coalesce", ["get", "iconScale"], 1],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      // Sits on top of the colored fallback badge (never on a real logo —
      // filtered to exactly the pins point-logos skips) so a company with
      // no logo shows its initial instead of a blank circle.
      map.addLayer({
        id: "point-initials",
        type: "symbol",
        source: SOURCE_ID,
        filter: ["all", ["!", ["has", "point_count"]], ["!", ["has", "icon"]]],
        layout: {
          "text-field": ["get", "initial"],
          "text-size": 15,
          // "Noto Sans Bold" 404s on CARTO's glyph server (see style.ts) —
          // "Open Sans Bold" is a variant confirmed to actually resolve there.
          "text-font": ["Open Sans Bold"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: { "text-color": "#ffffff" },
      });

      const clickableLayers = ["points", "point-logos", "point-initials"];

      map.on("click", clickableLayers, (e) => {
        const slug = e.features?.[0]?.properties?.slug as string | undefined;
        if (slug) router.push(`/${city.id}/company/${slug}`);
      });

      map.on("click", "clusters", async (e) => {
        const feature = e.features?.[0];
        const clusterId = feature?.properties?.cluster_id as number | undefined;
        const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource;
        if (clusterId == null || !feature) return;
        try {
          const zoom = await source.getClusterExpansionZoom(clusterId);
          const coords = (feature.geometry as GeoJSON.Point).coordinates as [
            number,
            number,
          ];
          // A little extra zoom past the minimum "would split" level and an
          // explicit ease-out curve — the point of clicking a cluster is
          // seeing it visibly divide into individual pins, not just barely
          // cross the threshold.
          map.easeTo({
            center: coords,
            zoom: zoom + 0.5,
            duration: 700,
            easing: (t) => 1 - (1 - t) * (1 - t),
          });
        } catch {
          // Cluster expansion is best-effort — a failed lookup just means
          // the click does nothing, not a broken map.
        }
      });

      for (const layer of clickableLayers) {
        map.on("mouseenter", layer, () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", layer, () => {
          map.getCanvas().style.cursor = "";
        });
      }

      // Fire-and-forget: map is already interactive at this point, so a
      // slow icon host (or a browser blocking it) never delays first paint.
      loadLogos(map, brandsRef.current).then((icons) => {
        iconsRef.current = icons;
        const source = map.getSource(SOURCE_ID) as
          | maplibregl.GeoJSONSource
          | undefined;
        source?.setData(toFeatureCollection(brandsRef.current, icons));
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(SOURCE_ID) as
      | maplibregl.GeoJSONSource
      | undefined;
    source?.setData(toFeatureCollection(brands, iconsRef.current));
  }, [brands]);

  // A deliberate camera move, separate from the source-patching effect
  // above (which never touches pan/zoom, so a search keystroke doesn't yank
  // the view around) — picking an area is different: the whole point is to
  // see that neighborhood. Reads brandsRef (always current, set at render
  // time above) rather than depending on `brands` directly, so this only
  // re-fires when the area selection itself changes, not on every
  // unrelated filter tweak that happens to also narrow the same area.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!focusArea) {
      map.easeTo({
        center: [city.centerLng, city.centerLat],
        zoom: city.defaultZoom,
        duration: 800,
      });
      return;
    }

    const points = brandsRef.current.filter(
      (b): b is BrandListItem & { lat: number; lng: number } =>
        b.area === focusArea && b.lat != null && b.lng != null,
    );
    if (points.length === 0) return;

    if (points.length === 1) {
      map.easeTo({
        center: [points[0].lng, points[0].lat],
        zoom: 15,
        duration: 800,
      });
      return;
    }

    const lngs = points.map((b) => b.lng);
    const lats = points.map((b) => b.lat);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 80, duration: 800, maxZoom: 16 },
    );
  }, [focusArea, city.centerLat, city.centerLng, city.defaultZoom]);

  return <div ref={containerRef} className="h-full w-full" />;
}

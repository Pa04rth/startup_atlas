import type { StyleSpecification } from "maplibre-gl";

// A light, legible style for the self-hosted PMTiles source, targeting the
// standard OpenMapTiles schema (Planetiler's default output — see
// infra/pmtiles/README.md for how the .pmtiles file itself is built).
// Font glyphs are the one remaining external call — self-hosting glyph PBFs
// is a separate, smaller task; this is a free, public, widely-used endpoint
// (not tied to map data/traffic) and easy to swap out later.
// NEXT_PUBLIC_MAPTILES_URL is the full URL of maharashtra.pmtiles; every
// other tileset is expected next to it in the same bucket/folder, named
// `<tileset>.pmtiles` (e.g. .../bengaluru.pmtiles). Unset stays unset — no
// silent fallback to a local file that won't exist in production.
export function getTilesUrl(tileset: string): string {
  const url = process.env.NEXT_PUBLIC_MAPTILES_URL ?? "";
  if (!url) return "";
  return url.replace(/[^/?#]+\.pmtiles(?=([?#].*)?$)/, `${tileset}.pmtiles`);
}

export function getStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    name: "Startup Atlas (self-hosted)",
    glyphs: "https://basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf",
    sources: {
      openmaptiles: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        // Required by the OpenMapTiles schema license (CC-BY) — MapLibre
        // renders this in its default attribution control automatically.
        attribution:
          '&copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#f4f6f5" } },
      {
        // Was filtered to "wood" only, and colored so pale it read as gray
        // — this is most of what "no greenery" actually was. Broadened to
        // grass/scrub too (real OSM tagging for city parks' lawns is
        // usually "grass", not "wood") and pushed to an actually-green
        // color at real opacity.
        id: "landcover-green",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landcover",
        filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "scrub"]]],
        paint: { "fill-color": "#bfe3c0", "fill-opacity": 0.85 },
      },
      {
        id: "landuse-residential",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: ["==", ["get", "class"], "residential"],
        paint: { "fill-color": "#eceeec", "fill-opacity": 0.6 },
      },
      {
        id: "park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "park",
        paint: { "fill-color": "#a8d5a8", "fill-opacity": 0.9 },
      },
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": "#b8d3e0" },
      },
      {
        id: "waterway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "waterway",
        paint: { "line-color": "#b8d3e0", "line-width": 1 },
      },
      {
        id: "water-name",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "water_name",
        minzoom: 12,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
        },
        paint: { "text-color": "#5a86a0", "text-halo-color": "#f4f6f5", "text-halo-width": 1.2 },
      },
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": "#e3e1dc",
          "fill-outline-color": "#d6d3cc",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.8],
        },
      },
      {
        id: "boundary-admin",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        filter: ["<=", ["get", "admin_level"], 4],
        paint: { "line-color": "#c4d0ca", "line-width": 1, "line-dasharray": [3, 2] },
      },
      {
        id: "road-path",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["path", "track"]]],
        minzoom: 14,
        paint: { "line-color": "#d6d3cc", "line-width": 1 },
      },
      {
        id: "road-minor",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]],
        minzoom: 12,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 18, 6],
        },
      },
      {
        id: "road-secondary-tertiary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["secondary", "tertiary"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 18, 10],
        },
      },
      {
        id: "road-primary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", ["get", "class"], "primary"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#f2d9b4",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.8, 18, 14],
        },
      },
      {
        id: "road-trunk-motorway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", ["get", "class"], ["literal", ["trunk", "motorway"]]],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#f2b47e",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 1, 18, 16],
        },
      },
      {
        // Road names following the road's own curve — this is most of what
        // reads as "detail" on a reference map vs. a bare road network.
        id: "road-name-major",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "transportation_name",
        filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary", "tertiary"]]],
        minzoom: 11,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-letter-spacing": 0.05,
        },
        paint: { "text-color": "#7a6a52", "text-halo-color": "#ffffff", "text-halo-width": 1.4 },
      },
      {
        id: "road-name-minor",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "transportation_name",
        filter: ["in", ["get", "class"], ["literal", ["minor", "service"]]],
        minzoom: 15,
        layout: {
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
        },
        paint: { "text-color": "#8b8378", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
      },
      {
        id: "place-city",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["==", ["get", "class"], "city"],
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 11, 10, 16],
        },
        paint: {
          "text-color": "#16211d",
          "text-halo-color": "#f4f6f5",
          "text-halo-width": 1.5,
        },
      },
      {
        id: "place-town-village",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["town", "village", "suburb"]]],
        minzoom: 10,
        layout: {
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#566761",
          "text-halo-color": "#f4f6f5",
          "text-halo-width": 1.2,
        },
      },
      {
        // Neighbourhood/quarter — the finest place granularity OpenMapTiles
        // has (e.g. "Bandra Kurla Complex", "Koregaon Park"). Styled
        // distinctly (uppercase, letter-spaced, bold) from town/suburb
        // labels above, matching how most reference basemaps set this tier
        // apart — this is most of what reads as "map detail" up close.
        id: "place-neighbourhood",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["in", ["get", "class"], ["literal", ["neighbourhood", "quarter"]]],
        minzoom: 13,
        layout: {
          "text-field": ["upcase", ["get", "name"]],
          // "Noto Sans Bold" 404s on CARTO's glyph server (verified before
          // committing to it) — Open Sans Bold is one of the variants that
          // actually resolves there.
          "text-font": ["Open Sans Bold"],
          "text-size": 10,
          "text-letter-spacing": 0.08,
        },
        paint: {
          "text-color": "#3d4f47",
          "text-halo-color": "#f4f6f5",
          "text-halo-width": 1.2,
        },
      },
    ],
  } as StyleSpecification;
}

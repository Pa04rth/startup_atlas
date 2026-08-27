# Self-hosted PMTiles — Pune + Mumbai

How `apps/web/public/tiles/maharashtra.pmtiles` gets built, and how to rebuild it (new bounds,
newer OSM data, or after Planetiler releases an update).

## Why this exists

CLAUDE.md §2 locks "MapLibre + self-hosted PMTiles — zero per-view API calls" as the map tile
strategy. Before this, `MapView.tsx` used CARTO's free hosted basemap — good enough to ship fast,
but still an external dependency at map-render time. This pipeline replaces that with a single
static file you control, serving real roads/buildings/water/labels with no external tile calls
(only font glyphs remain external — see `apps/web/lib/map/style.ts`'s comment).

## The pipeline

```
OSM extract (Geofabrik, western India)
        │
        ▼
   Planetiler (Java, OpenMapTiles profile)  ──bounded to Pune+Mumbai──▶  maharashtra.pmtiles
        │                                                                       │
        ▼                                                                       ▼
  auxiliary datasets                                            apps/web/public/tiles/
  (water polygons, natural                                      (served as a static asset,
   earth, lake centerlines —                                     HTTP range-request-backed)
   auto-downloaded, cached)                                             │
                                                                         ▼
                                                          MapView.tsx reads tiles directly
                                                          via the pmtiles:// protocol —
                                                          no tile server process needed
```

## Rebuilding it

Requires **Java 21+** (Planetiler's requirement — a portable JDK is fine, no system install
needed). Everything below runs from `infra/pmtiles/build/` (gitignored — nothing here is
committed; large binaries have no business in git).

```bash
cd infra/pmtiles/build

# One-time: portable JDK 21 (skip if you already have Java 21+ on PATH)
curl -sL -o jdk21.zip "https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse"
# unzip jdk21.zip into ./jdk21/ (PowerShell: Expand-Archive jdk21.zip jdk21 -Force)

# One-time: Planetiler itself
curl -sL -o planetiler.jar "https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"

# The OSM extract — western-zone covers Maharashtra + neighboring states.
# Geofabrik doesn't offer a Maharashtra-only extract; this is the smallest
# zone-level extract that fully contains it (~220MB).
curl -sL -o western-zone.osm.pbf "https://download.geofabrik.de/asia/india/western-zone-latest.osm.pbf"

# Build — bounded tightly to Pune+Mumbai so the OUTPUT stays small even
# though the input covers a wider area. --download fetches the three small
# auxiliary datasets (water polygons, natural earth, lake centerlines) on
# first run and caches them under ./data/ for next time.
./jdk21/jdk-21.0.12.1+1/bin/java.exe -Xmx3g -jar planetiler.jar \
  --osm-path=western-zone.osm.pbf \
  --output=../../../apps/web/public/tiles/maharashtra.pmtiles \
  --bounds=72.6,18.25,74.15,19.35 \
  --download \
  --force
```

Took ~16 minutes on this machine (most of it the one-time auxiliary-dataset download — reruns
with `--download` omitted and cached `data/` present are much faster, since only `osm_pass1`
through `archive` re-run). Output: a single **38MB** `.pmtiles` file, zoom 0–14, 5,180 tiles,
covering `72.6,18.25 → 74.15,19.35` — real roads, buildings, water, land use, and place labels for
the OpenMapTiles schema (verified layers: `water`, `waterway`, `landcover`, `landuse`, `park`,
`building`, `boundary`, `transportation`, `transportation_name`, `place`, `poi`, `water_name`,
`aeroway`, `aerodrome_label`, `mountain_peak`, `housenumber`).

## Expanding coverage later (Mumbai suburbs, more of Maharashtra, etc.)

Just widen `--bounds` and re-run — `western-zone.osm.pbf` already has the source data for anywhere
in western India, no new download needed. Keep the bbox as tight as your actual coverage needs;
every extra degree makes the output bigger and slower to build, with no benefit if nothing's
rendered there.

## Production hosting

A 38MB (and growing, as coverage expands) binary doesn't belong in a Vercel deployment bundle or
in git. Move it to **Cloudflare R2** (CLAUDE.md's designated object storage) or S3 — anything that
serves static files with HTTP range-request support, which is all PMTiles needs. Update the
`pmtilesUrl` computation in `MapView.tsx` (currently `${window.location.origin}/tiles/...`) to
point at the R2/S3 URL instead. No other code changes — the `pmtiles://` protocol handler and the
style don't care where the bytes come from.

## Updating the style

`apps/web/lib/map/style.ts` defines what the tiles actually look like — colors, road widths by
zoom, which labels show at which zoom. The vector tiles themselves carry no visual style, just
geometry + attributes (`class`, `admin_level`, etc.), all per the standard OpenMapTiles schema
(https://openmaptiles.org/schema/). Add a layer there for anything not currently rendered — the
data's likely already in the tiles (see the `vector_layers` list above) even if there's no style
rule painting it yet (POI icons and road-name-along-line labels are the two most obviously
missing pieces from the current style).

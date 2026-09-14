// Thin client for self-hosted-or-public Nominatim. Respect the 1 req/sec
// rate limit if you're using the public instance (see steps/geocode.ts,
// which sleeps between calls) — self-host if you outgrow that.
const BASE_URL = process.env.NOMINATIM_BASE_URL ?? "https://nominatim.openstreetmap.org";
const USER_AGENT = process.env.NOMINATIM_USER_AGENT ?? "startup-atlas/0.1";

export type NominatimHit = {
  lat: number;
  lng: number;
  precision: "building" | "street";
};

// `bbox` ([west, south, east, north]) bounds the search to one city, so a
// bare locality like "Koramangala" or "Baner" can only resolve inside the
// city it was filed under — never to a same-named place elsewhere.
export async function geocodeAddress(
  address: string,
  bbox?: [number, number, number, number]
): Promise<NominatimHit | null> {
  let url = `${BASE_URL}/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(address)}`;
  if (bbox) {
    const [west, south, east, north] = bbox;
    url += `&viewbox=${west},${north},${east},${south}&bounded=1`;
  }
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} for "${address}"`);
  }

  const results = (await res.json()) as Array<{ lat: string; lon: string; class: string; type: string }>;
  if (results.length === 0) return null;

  const hit = results[0];
  const precision: NominatimHit["precision"] =
    hit.class === "building" || hit.type === "house" ? "building" : "street";

  return { lat: parseFloat(hit.lat), lng: parseFloat(hit.lon), precision };
}

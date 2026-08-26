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

export async function geocodeAddress(address: string): Promise<NominatimHit | null> {
  const url = `${BASE_URL}/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
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

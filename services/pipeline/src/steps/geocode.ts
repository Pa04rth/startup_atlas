// Turn an address into a pin. If we don't have a real address, or Nominatim
// can't find it, fall back to the city centroid with precision downgraded
// to "synthetic" — the honesty rule from CLAUDE.md: never fake a precise pin.
import { cities } from "@startup-atlas/config";
import { geocodeAddress } from "../lib/nominatim";
import type { GeocodedRecord, NormalizedRecord } from "../types";

const NOMINATIM_DELAY_MS = 1100; // public instance: max 1 req/sec

export async function geocode(records: NormalizedRecord[], cityId: string): Promise<GeocodedRecord[]> {
  const city = cities.find((c) => c.id === cityId);
  if (!city) throw new Error(`unknown city "${cityId}"`);

  const out: GeocodedRecord[] = [];

  for (const record of records) {
    if (record.address) {
      const hit = await geocodeAddress(record.address, city.bbox);
      await new Promise((resolve) => setTimeout(resolve, NOMINATIM_DELAY_MS));

      if (hit) {
        out.push({
          ...record,
          lat: hit.lat,
          lng: hit.lng,
          precision: hit.precision,
          locationSource: "nominatim",
        });
        continue;
      }
    }

    out.push({
      ...record,
      lat: city.centerLat,
      lng: city.centerLng,
      precision: "synthetic",
      locationSource: "city-centroid-fallback",
    });
  }

  return out;
}

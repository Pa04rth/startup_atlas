// Pure transform: RawRecord[] -> NormalizedRecord[]. No I/O, no network —
// every step file downstream of this one follows the same "pure function"
// shape, which is what makes them easy to unit test and reorder.
import { slugify } from "@startup-atlas/core";
import type { NormalizedRecord, RawRecord } from "../types";

function domainFromWebsite(website?: string): string | undefined {
  if (!website) return undefined;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

export function normalize(raw: RawRecord[]): NormalizedRecord[] {
  return raw
    .filter((r) => r.name.trim().length > 0)
    .map((r) => ({
      name: r.name.trim(),
      slug: slugify(r.name),
      website: r.website,
      domain: domainFromWebsite(r.website),
      tagline: r.tagline,
      description: r.description,
      address: r.address,
      logoUrl: r.logoUrl,
      foundedYear: r.foundedYear,
      sector: r.sector,
      sourceUrl: r.sourceUrl,
      sourceName: r.sourceName,
    }));
}

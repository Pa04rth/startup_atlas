// Collapse the same startup seen from multiple sources into one record,
// preferring whichever version already has a field filled in. Keyed on
// domain first (most reliable identity signal), falling back to slug.
import type { NormalizedRecord } from "../types";

export function dedupe(records: NormalizedRecord[]): NormalizedRecord[] {
  const byKey = new Map<string, NormalizedRecord>();

  for (const record of records) {
    const key = record.domain ?? record.slug;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, record);
      continue;
    }
    byKey.set(key, {
      ...existing,
      tagline: existing.tagline ?? record.tagline,
      description: existing.description ?? record.description,
      address: existing.address ?? record.address,
      logoUrl: existing.logoUrl ?? record.logoUrl,
      foundedYear: existing.foundedYear ?? record.foundedYear,
      sector: existing.sector ?? record.sector,
    });
  }

  return [...byKey.values()];
}

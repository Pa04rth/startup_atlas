// Score each record 0-100 and assign its review_status tier. The weights
// live in packages/core (shared with anything else that ever needs to
// reason about trust, e.g. the admin panel) — this step just supplies inputs.
import { scoreRecord, tierFromScore } from "@startup-atlas/core";
import type { GeocodedRecord, ScoredRecord } from "../types";

export function verifyScore(records: GeocodedRecord[]): ScoredRecord[] {
  return records.map((record) => {
    const score = scoreRecord({
      hasWebsite: !!record.website,
      hasDomain: !!record.domain,
      hasSector: !!record.sector, // real for sources that state it (e.g. inc42.ts); false elsewhere
      hasStage: false,
      descriptionLength: record.description?.length ?? 0,
      hasFoundedYear: !!record.foundedYear,
      precision: record.precision,
      seenInSourceCount: 1, // dedupe.ts doesn't track this yet — see TODO there
    });

    return { ...record, score, status: tierFromScore(score) };
  });
}

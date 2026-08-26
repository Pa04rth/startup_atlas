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
      hasSector: false, // becomes true once a sector-classification step exists
      hasStage: false,
      descriptionLength: record.description?.length ?? 0,
      hasFoundedYear: false,
      precision: record.precision,
      seenInSourceCount: 1, // dedupe.ts doesn't track this yet — see TODO there
    });

    return { ...record, score, status: tierFromScore(score) };
  });
}

import { PRECISION_WEIGHTS, type LocPrecision } from "./types";

export type ScoringInput = {
  hasWebsite: boolean;
  hasDomain: boolean;
  hasSector: boolean;
  hasStage: boolean;
  descriptionLength: number;
  hasFoundedYear: boolean;
  precision: LocPrecision;
  seenInSourceCount: number;
};

// Weights from CLAUDE.md section 5 ("Verification tiers"). Never penalize
// bootstrapped/unfunded startups — there is deliberately no "has funding" signal.
export function scoreRecord(input: ScoringInput): number {
  let score = 0;
  if (input.hasWebsite) score += 20;
  if (input.hasDomain) score += 8;
  if (input.hasSector) score += 8;
  if (input.hasStage) score += 8;
  if (input.descriptionLength > 40) score += 8;
  if (input.hasFoundedYear) score += 6;
  score += PRECISION_WEIGHTS[input.precision];
  if (input.seenInSourceCount >= 2) score += 6;
  return Math.min(score, 100);
}

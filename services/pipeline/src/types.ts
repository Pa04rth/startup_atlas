import type { LocPrecision, ReviewStatus } from "@startup-atlas/core";

// What a source collector returns — untouched, source-shaped data.
export type RawRecord = {
  name: string;
  website?: string;
  tagline?: string;
  description?: string;
  address?: string;
  sourceUrl: string;
  sourceName: string;
};

// After steps/normalize.ts — one common shape every later step can rely on.
export type NormalizedRecord = {
  name: string;
  slug: string;
  website?: string;
  domain?: string;
  tagline?: string;
  description?: string;
  address?: string;
  sourceUrl: string;
  sourceName: string;
};

// After steps/geocode.ts
export type GeocodedRecord = NormalizedRecord & {
  lat: number;
  lng: number;
  precision: LocPrecision;
  locationSource: string;
};

// After steps/verify_score.ts — ready for steps/upsert.ts
export type ScoredRecord = GeocodedRecord & {
  score: number;
  status: ReviewStatus;
};

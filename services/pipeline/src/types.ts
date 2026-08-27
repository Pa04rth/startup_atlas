import type { LocPrecision, ReviewStatus } from "@startup-atlas/core";

// What a source collector returns — untouched, source-shaped data.
// logoUrl/foundedYear are optional: most sources don't have them (fall back
// to services/pipeline/src/lib/logos.ts's domain-based fetch, and to
// unknown founding year), but a source that already has a real hosted logo
// or a stated founding year (e.g. sources/inc42.ts) should pass it straight
// through rather than have it re-guessed later.
export type RawRecord = {
  name: string;
  website?: string;
  tagline?: string;
  description?: string;
  address?: string;
  logoUrl?: string;
  foundedYear?: number;
  sector?: string;
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
  logoUrl?: string;
  foundedYear?: number;
  sector?: string;
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

// What sources/news_rss.ts returns — a plain article, not a brand candidate.
// Kept separate from RawRecord on purpose: an RSS headline is not a sourced
// fact about a company, so it never enters the normalize/dedupe/geocode/
// verify_score/upsert pipeline. See steps/refresh_news.ts.
export type NewsItem = {
  title: string;
  url: string;
  source: string;
  publishedAt: string | null;
};

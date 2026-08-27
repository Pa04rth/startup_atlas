// Fixed filter taxonomy, not derived from live brand data (compare
// packages/db/queries/brands.ts + apps/web/lib/snapshot.ts, which build
// "areas"/"kinds" facets from whatever's actually in the DB). These options
// are shown in the sector filter ahead of any brand actually being tagged
// against them — deliberately not wired into scoring/enrichment yet. Do not
// backfill brands.sector to match this list until asked; that's a separate
// classification pass.
export const SECTORS = [
  "AI",
  "Consumer",
  "D2C",
  "Deeptech",
  "Edtech",
  "Fintech",
  "Gaming",
  "Healthtech",
  "Logistics",
  "SaaS",
  "Other",
] as const;

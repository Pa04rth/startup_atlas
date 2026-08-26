export type LocPrecision =
  | "exact"
  | "building"
  | "street"
  | "locality"
  | "area"
  | "city"
  | "synthetic";

export type ReviewStatus = "published" | "probable" | "review" | "archived";

export const PRECISION_WEIGHTS: Record<LocPrecision, number> = {
  exact: 18,
  building: 18,
  street: 18,
  locality: 6,
  area: 6,
  city: 0,
  synthetic: 0,
};

export function tierFromScore(score: number): ReviewStatus {
  if (score >= 75) return "published";
  if (score >= 55) return "probable";
  if (score >= 35) return "review";
  return "archived";
}

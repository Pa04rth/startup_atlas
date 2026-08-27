// Same deal as sectors.ts — a fixed filter taxonomy shown ahead of any
// brand actually being classified against it. Ordered as a rough funding
// progression rather than the incumbent's on-screen order, since that
// order looked unintentional; the values themselves are unchanged.
export const STAGES = [
  "Pre-seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series C+",
  "Bootstrapped",
  "Acquired",
  "Public",
] as const;

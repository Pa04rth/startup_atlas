// Anchored to CLAUDE.md §9. Shared by the advertise form and the API route
// so the price a client sees is always the price the server charges —
// never trust a client-supplied amount for anything payment-adjacent.
export const AD_PRICING: Record<string, number> = {
  boost: 2500,
  featured: 5000,
  flash: 2500,
  banner: 3000,
};

export const AD_LABELS: Record<string, string> = {
  boost: "Boosted pin — ₹2,500 / 7 days",
  featured: "Sponsor tile — ₹5,000 / 7 days",
  flash: "Flash promo — ₹2,500 / 24 hours",
  banner: "Banner — ₹3,000 / 7 days",
};

export type AdKind = keyof typeof AD_PRICING;

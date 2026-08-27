// The hybrid switch (CLAUDE.md §4/§6): builds one cached snapshot per city
// straight from Postgres. This is the ONLY file you'd touch to flip a city
// from "ship the whole snapshot, filter in memory" to "bounds query +
// Typesense" once it outgrows client-side filtering (packages/config's
// per-city `useBounds` flag decides when) — every UI component reading
// this shape stays exactly the same either way.
import { cities, type CityConfig } from "@startup-atlas/config";
import { getPublishedBrands, type BrandListItem } from "@startup-atlas/db";

export type CitySnapshot = {
  city: CityConfig;
  brands: BrandListItem[];
  facets: {
    areas: string[];
    stages: string[];
    sectors: string[];
    kinds: string[];
  };
};

export async function getCitySnapshot(cityId: string): Promise<CitySnapshot | null> {
  const city = cities.find((c) => c.id === cityId);
  if (!city) return null;

  // Only published/probable brands ever reach a snapshot — see
  // packages/db/queries/brands.ts. review/archived rows never leave the DB.
  const brands = await getPublishedBrands(cityId);

  const areas = new Set<string>();
  const stages = new Set<string>();
  const sectors = new Set<string>();
  const kinds = new Set<string>();

  for (const brand of brands) {
    if (brand.area) areas.add(brand.area);
    if (brand.stage) stages.add(brand.stage);
    if (brand.sector) sectors.add(brand.sector);
    kinds.add(brand.kind);
  }

  return {
    city,
    brands,
    facets: {
      areas: [...areas].sort(),
      stages: [...stages].sort(),
      sectors: [...sectors].sort(),
      kinds: [...kinds].sort(),
    },
  };
}

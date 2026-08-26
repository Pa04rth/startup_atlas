import type { RawRecord } from "../types";
import { collectVentureCenterPortfolio } from "./incubators";

export type Collector = {
  name: string;
  cities: string[]; // which city ids this source applies to
  run: () => Promise<RawRecord[]>;
};

// Register every source here. Add dpiit.ts, news_rss.ts, company_site.ts,
// msins.ts, etc. following the shape of incubators.ts, then add a row below.
export const collectors: Collector[] = [
  { name: "venture-center", cities: ["pune"], run: collectVentureCenterPortfolio },
];

export function collectorsForCity(cityId: string): Collector[] {
  return collectors.filter((c) => c.cities.includes(cityId));
}

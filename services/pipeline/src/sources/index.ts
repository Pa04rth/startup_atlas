import type { RawRecord } from "../types";
import { collectVentureCenterPortfolio } from "./incubators";
import { collectWellfoundPune, collectWellfoundMumbai, collectWellfoundBengaluru } from "./wellfound";
import { collectInc42PuneFundedList, collectInc42BengaluruFundedList } from "./inc42";

export type Collector = {
  name: string;
  cities: string[]; // which city ids this source applies to
  run: () => Promise<RawRecord[]>;
};

// Register every source here. Add dpiit.ts, news_rss.ts, company_site.ts,
// msins.ts, etc. following the shape of incubators.ts, then add a row below.
//
// Mumbai previously had zero registered collectors — "wellfound-mumbai"
// below is the fix; everything else here is Pune-only until a Mumbai-
// specific equivalent exists for it (inc42's list is a one-off curated
// article, not a parametrized city page like Wellfound's).
export const collectors: Collector[] = [
  { name: "venture-center", cities: ["pune"], run: collectVentureCenterPortfolio },
  { name: "wellfound", cities: ["pune"], run: collectWellfoundPune },
  { name: "wellfound-mumbai", cities: ["mumbai"], run: collectWellfoundMumbai },
  { name: "inc42", cities: ["pune"], run: collectInc42PuneFundedList },
  { name: "wellfound-bengaluru", cities: ["bengaluru"], run: collectWellfoundBengaluru },
  { name: "inc42-bengaluru", cities: ["bengaluru"], run: collectInc42BengaluruFundedList },
];

export function collectorsForCity(cityId: string): Collector[] {
  return collectors.filter((c) => c.cities.includes(cityId));
}

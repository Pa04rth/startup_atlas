// One collector per free source. This is the reference example — copy this
// shape for dpiit.ts, news_rss.ts, company_site.ts, etc. A collector's only
// job is: fetch, pull out names/URLs, return RawRecord[]. No normalizing,
// no scoring, no DB — if this source's page changes or goes down, only this
// file breaks, the rest of the pipeline keeps running.
//
// NOTE: the CSS selectors below are illustrative placeholders — inspect the
// live portfolio page in devtools and adjust `.portfolio-item` etc. to match.
import * as cheerio from "cheerio";
import type { RawRecord } from "../types";

const PORTFOLIO_URL = "https://venturecenter.co.in/portfolio/";
const SOURCE_NAME = "venture-center";

export async function collectVentureCenterPortfolio(): Promise<RawRecord[]> {
  const res = await fetch(PORTFOLIO_URL);
  if (!res.ok) {
    throw new Error(`fetch ${PORTFOLIO_URL} -> ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const records: RawRecord[] = [];

  $(".portfolio-item").each((_, el) => {
    const name = $(el).find(".company-name").text().trim();
    if (!name) return;

    const website = $(el).find("a.website-link").attr("href")?.trim();
    const tagline = $(el).find(".company-tagline").text().trim();

    records.push({
      name,
      website: website || undefined,
      tagline: tagline || undefined,
      sourceUrl: PORTFOLIO_URL,
      sourceName: SOURCE_NAME,
    });
  });

  return records;
}

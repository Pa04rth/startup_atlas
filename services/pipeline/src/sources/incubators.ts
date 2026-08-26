// One collector per free source. This is the reference example — copy this
// shape for dpiit.ts, company_site.ts, etc. A collector's only job is:
// fetch, pull out names/URLs, return RawRecord[]. No normalizing, no
// scoring, no DB — if this source's page changes or goes down, only this
// file breaks, the rest of the pipeline keeps running.
//
// Selectors verified against the live page on 2026-08-26 (142 entries under
// #StartupsListing, one <article> per startup). Note the real host is
// www.venturecenter.co.in — the bare domain 404s.
import * as cheerio from "cheerio";
import type { RawRecord } from "../types";

const PORTFOLIO_URL = "https://www.venturecenter.co.in/startups-and-success-stories/startups";
const SOURCE_NAME = "venture-center";

// Titles on this page look like "Call X Ringers Pvt Ltd (2026)" — the
// trailing "(YYYY)" is a founding year, not part of the name.
const TRAILING_YEAR = /\s*\(\d{4}\)\s*$/;

export async function collectVentureCenterPortfolio(): Promise<RawRecord[]> {
  const res = await fetch(PORTFOLIO_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) {
    throw new Error(`fetch ${PORTFOLIO_URL} -> ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const records: RawRecord[] = [];

  $(".startups-list article").each((_, el) => {
    const link = $(el).find(".text h3 a").first();
    const rawTitle = link.text().trim();
    const name = rawTitle.replace(TRAILING_YEAR, "").trim();
    if (!name) return;

    const website = link.attr("href")?.trim();
    const description = $(el).find(".summary").first().text().trim();

    records.push({
      name,
      website: website || undefined,
      description: description || undefined,
      sourceUrl: PORTFOLIO_URL,
      sourceName: SOURCE_NAME,
    });
  });

  return records;
}

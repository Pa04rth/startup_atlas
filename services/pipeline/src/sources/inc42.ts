// Inc42's ranked lists ("Top 30 Funded Startups in Pune") are genuinely
// server-rendered with rich structured data — verified against the live
// page: 25+ entries with name, description, a real hosted logo, sector, and
// founding year all present in plain HTML. No external website link is
// available on this page though (every link points back to Inc42's own
// /company/ profile, not the startup's real site) — website/domain stay
// unset here, which also means the automatic per-domain logo cache
// (services/pipeline/src/lib/logos.ts) never triggers for these records,
// but that's fine: Inc42's own logoUrl is used directly instead.
import * as cheerio from "cheerio";
import type { RawRecord } from "../types";

const SOURCE_NAME = "inc42";

// Same page template for every city (verified against the live Bengaluru
// list too — same .company-list-profile markup), only the slug differs.
const PUNE_LIST_URL = "https://inc42.com/lists/top-30-funded-startups-in-pune-2026/";
const BENGALURU_LIST_URL = "https://inc42.com/lists/top-30-funded-startups-in-bengaluru-2026/";

export function collectInc42PuneFundedList(): Promise<RawRecord[]> {
  return collectInc42List(PUNE_LIST_URL);
}

export function collectInc42BengaluruFundedList(): Promise<RawRecord[]> {
  return collectInc42List(BENGALURU_LIST_URL);
}

async function collectInc42List(listUrl: string): Promise<RawRecord[]> {
  const res = await fetch(listUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; startup-atlas/0.1)" } });
  if (!res.ok) {
    throw new Error(`fetch ${listUrl} -> ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);
  const records: RawRecord[] = [];

  $(".company-list-profile").each((_, el) => {
    const $el = $(el);
    // The container's `id` attribute is the plain company name — more
    // stable than parsing the "1. FirstCry" rank-prefixed heading text.
    const name = $el.attr("id")?.trim();
    if (!name) return;

    const description = $el.find("p").first().text().trim();
    const logoUrl = $el.find("img").first().attr("src")?.trim();

    let sector: string | undefined;
    let foundedYear: number | undefined;
    $el.find("li").each((_, li) => {
      const $li = $(li);
      const label = $li.find("p").first().text().trim().toLowerCase();
      const value = $li.find("h6").first().text().trim();
      if (label === "sector" && value) sector = value;
      if (label === "founded" && value) {
        const year = Number.parseInt(value, 10);
        if (Number.isFinite(year)) foundedYear = year;
      }
    });

    records.push({
      name,
      description: description || undefined,
      logoUrl: logoUrl || undefined,
      sector,
      foundedYear,
      sourceUrl: listUrl,
      sourceName: SOURCE_NAME,
    });
  });

  return records;
}

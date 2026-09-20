// Back-office refinement pass over Bengaluru brands that were bulk-copied
// from bangalorestartupmap.com (import-bangalorestartupmap.ts) straight to
// 'published' with no verification. This is the promised follow-up: for
// each brand it re-derives facts from the company's OWN website — never
// touches status (nothing gets removed or hidden here, per the plan: load
// first, verify at the back after) — and fills only what's missing.
//
//   pnpm --filter services-pipeline run verify-bengaluru -- --dry-run --limit=20
//   pnpm --filter services-pipeline run verify-bengaluru
//   pnpm --filter services-pipeline run verify-bengaluru -- --logos-only
//   pnpm --filter services-pipeline run verify-bengaluru -- --all
//
// What "reviewed" means here, concretely: brands.last_verified_at is
// already the field the public profile's "verified Xd ago" badge reads
// (VerifiedBadge.tsx) — no new column needed. This script sets it only when
// it successfully fetched and reconciled a brand's own website; a brand
// whose site is dead/unreachable is left NULL (still "not reviewed") and
// flagged in the report instead, because we have no new facts to stand
// behind for it. verify-listings.ts is the separate, existing tool for
// actually archiving a confirmed-dead site — this script never changes
// `status`.
//
// What gets filled, and only ever into an empty field (COALESCE — an
// existing value, even one copied from bangalorestartupmap.com, is never
// overwritten by this pass):
//   * description  <- the site's own <meta name="description"> / og:description
//   * logo_url     <- lib/logo-search.ts's multi-source search (site's own
//                     icon links first, third-party lookups as fallback)
// Every fill is recorded in field_evidence against a 'startup-atlas-verify'
// source row, same provenance discipline as every other importer.
//
// Output: an .xlsx workbook under services/pipeline/reports/ — a Summary
// sheet with the review tally the user asked to keep, and a Companies sheet
// listing every brand touched, so gaps and unusual finds are easy to skim.
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { getPool } from "@startup-atlas/db";
import { searchLogo } from "./lib/logo-search";
import { withRetry } from "./lib/retry";
import { eachConcurrent } from "./lib/concurrency";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CITY_ID = "bengaluru";
const SOURCE_NAME = "startup-atlas-verify";
const USER_AGENT = "startup-atlas/0.1 (contact: parthsohaney04@gmail.com)";
const FETCH_TIMEOUT_MS = 15000;
const CONCURRENCY = 6;
const EVIDENCE_CONFIDENCE = 55; // freshly re-derived from the company's own site
const MIN_DESCRIPTION_LEN = 25; // shorter than this is boilerplate ("Home"), not a real description

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const DRY_RUN = process.argv.includes("--dry-run");
const LOGOS_ONLY = process.argv.includes("--logos-only");
const REVERIFY_ALL = process.argv.includes("--all");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;

type Brand = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  domain: string | null;
  description: string | null;
  logo_url: string | null;
  last_verified_at: string | null;
};

type Verdict = "alive" | "dead" | "unreachable" | "no-website";

type ReportRow = {
  name: string;
  slug: string;
  website: string | null;
  verdict: Verdict;
  hadDescription: boolean;
  descriptionFilled: boolean;
  hadLogo: boolean;
  logoFilled: boolean;
  logoSource: string | null;
  wasVerified: boolean;
  nowVerified: boolean;
  notes: string;
};

function extractMeta(html: string, ...names: string[]): string | null {
  for (const name of names) {
    const byName = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, "i").exec(html);
    if (byName?.[1]) return byName[1];
    const byProperty = new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, "i").exec(html);
    if (byProperty?.[1]) return byProperty[1];
    // Same two attributes, reversed order (content before name/property) —
    // real-world markup isn't consistent about it.
    const byNameRev = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, "i").exec(html);
    if (byNameRev?.[1]) return byNameRev[1];
    const byPropertyRev = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${name}["']`, "i").exec(
      html
    );
    if (byPropertyRev?.[1]) return byPropertyRev[1];
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

async function fetchHomepage(url: string): Promise<{ ok: true; html: string } | { ok: false; verdict: Verdict }> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 404) return { ok: false, verdict: "dead" };
    if (!res.ok) return { ok: false, verdict: "unreachable" };
    return { ok: true, html: await res.text() };
  } catch (err) {
    const message = `${(err as Error).message} ${String((err as { cause?: unknown }).cause ?? "")}`;
    if (/ENOTFOUND|getaddrinfo/i.test(message)) return { ok: false, verdict: "dead" };
    return { ok: false, verdict: "unreachable" };
  }
}

async function sourceId(pool: ReturnType<typeof getPool>): Promise<number> {
  const existing = await pool.query(`select id from sources where name = $1 limit 1`, [SOURCE_NAME]);
  if (existing.rows[0]) return existing.rows[0].id as number;
  const inserted = await pool.query(
    `insert into sources (name, kind, base_url) values ($1, 'verification', null) returning id`,
    [SOURCE_NAME]
  );
  return inserted.rows[0].id as number;
}

async function processBrand(
  pool: ReturnType<typeof getPool>,
  brand: Brand,
  srcId: number
): Promise<ReportRow> {
  const hadDescription = !!brand.description;
  const hadLogo = !!brand.logo_url;
  const wasVerified = !!brand.last_verified_at;

  if (!brand.website || !brand.domain) {
    return {
      name: brand.name,
      slug: brand.slug,
      website: brand.website,
      verdict: "no-website",
      hadDescription,
      descriptionFilled: false,
      hadLogo,
      logoFilled: false,
      logoSource: null,
      wasVerified,
      nowVerified: wasVerified,
      notes: "no website on file — nothing to verify against",
    };
  }

  // --logos-only still fetches the homepage (cheap, and this is what
  // decides "alive" for last_verified_at) — it only skips using that page
  // to fill in a description.
  const fetched = await fetchHomepage(brand.website);
  const verdict: Verdict = fetched.ok ? "alive" : fetched.verdict;

  let newDescription: string | null = null;
  if (!LOGOS_ONLY && fetched.ok && !brand.description) {
    const raw = extractMeta(fetched.html, "description", "og:description");
    const cleaned = raw ? decodeEntities(raw) : null;
    if (cleaned && cleaned.length >= MIN_DESCRIPTION_LEN) newDescription = cleaned.slice(0, 2000);
  }

  let logoResult: { logoUrl: string; foundVia: string } | null = null;
  if (!brand.logo_url) {
    try {
      logoResult = await searchLogo(brand.domain, brand.website);
    } catch {
      // A logo search failure never blocks the rest of this brand's update.
    }
  }

  const notes: string[] = [];
  if (verdict === "dead") notes.push("site returns 404 / DNS not found — see verify-listings for archiving");
  if (verdict === "unreachable") notes.push("site unreachable from this machine (timeout/blocked/TLS) — inconclusive");
  if (!hadLogo && !logoResult) notes.push("no logo found by any strategy — still on initials avatar");

  if (!DRY_RUN && verdict === "alive") {
    await withRetry(() =>
      pool.query(
        `update brands set
           description = coalesce(description, $2),
           logo_url = coalesce(logo_url, $3),
           last_verified_at = now(),
           updated_at = now()
         where id = $1`,
        [brand.id, newDescription, logoResult?.logoUrl ?? null]
      )
    );

    const evidence: Array<[string, string]> = [];
    if (newDescription) evidence.push(["description", newDescription]);
    if (logoResult) evidence.push(["logo_url", logoResult.logoUrl]);
    for (const [field, value] of evidence) {
      await withRetry(() =>
        pool.query(
          `insert into field_evidence (entity, entity_id, field, value, source_id, source_url, confidence)
           values ('brand',$1,$2,$3,$4,$5,$6)`,
          [brand.id, field, value, srcId, brand.website, EVIDENCE_CONFIDENCE]
        )
      );
    }
  }

  return {
    name: brand.name,
    slug: brand.slug,
    website: brand.website,
    verdict,
    hadDescription,
    descriptionFilled: !!newDescription,
    hadLogo,
    logoFilled: !!logoResult,
    logoSource: logoResult?.foundVia ?? null,
    wasVerified,
    nowVerified: wasVerified || (!DRY_RUN && verdict === "alive"),
    notes: notes.join("; "),
  };
}

async function writeReport(rows: ReportRow[], totals: { total: number; verifiedBefore: number }) {
  const wb = new ExcelJS.Workbook();

  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ header: "Metric", key: "metric", width: 42 }, { header: "Count", key: "count", width: 14 }];
  const processed = rows.length;
  const reviewedNow = rows.filter((r) => r.nowVerified && !r.wasVerified).length;
  const stillNotReviewed = totals.total - (totals.verifiedBefore + reviewedNow);
  const metrics: Array<[string, number]> = [
    ["Bengaluru brands — total", totals.total],
    ["Reviewed before this run", totals.verifiedBefore],
    ["Reviewed in this run", reviewedNow],
    ["Still not reviewed (after this run)", Math.max(stillNotReviewed, 0)],
    ["Brands processed this run", processed],
    ["  — website alive", rows.filter((r) => r.verdict === "alive").length],
    ["  — website dead (404 / DNS)", rows.filter((r) => r.verdict === "dead").length],
    ["  — website unreachable (inconclusive)", rows.filter((r) => r.verdict === "unreachable").length],
    ["  — no website on file", rows.filter((r) => r.verdict === "no-website").length],
    ["Descriptions filled this run", rows.filter((r) => r.descriptionFilled).length],
    ["Logos filled this run", rows.filter((r) => r.logoFilled).length],
    ["  — via site's own icon", rows.filter((r) => r.logoSource === "site-icon").length],
    ["  — via og:image", rows.filter((r) => r.logoSource === "og-image").length],
    ["  — via Clearbit", rows.filter((r) => r.logoSource === "clearbit").length],
    ["  — via DuckDuckGo", rows.filter((r) => r.logoSource === "duckduckgo").length],
    ["  — via Google favicons (weakest)", rows.filter((r) => r.logoSource === "google-favicon").length],
    ["Still no logo after this run", rows.filter((r) => !r.hadLogo && !r.logoFilled).length],
  ];
  for (const [metric, count] of metrics) {
    summary.addRow({ metric, count });
  }
  summary.addRow({ metric: "Dry run (nothing written to the database)", count: DRY_RUN ? "YES" : "no" });
  summary.getRow(1).font = { bold: true };

  const companies = wb.addWorksheet("Companies");
  companies.columns = [
    { header: "Name", key: "name", width: 30 },
    { header: "Slug", key: "slug", width: 28 },
    { header: "Website", key: "website", width: 32 },
    { header: "Website status", key: "verdict", width: 14 },
    { header: "Had description?", key: "hadDescription", width: 16 },
    { header: "Description filled?", key: "descriptionFilled", width: 18 },
    { header: "Had logo?", key: "hadLogo", width: 10 },
    { header: "Logo filled?", key: "logoFilled", width: 12 },
    { header: "Logo source", key: "logoSource", width: 14 },
    { header: "Reviewed before?", key: "wasVerified", width: 16 },
    { header: "Reviewed now?", key: "nowVerified", width: 14 },
    { header: "Notes", key: "notes", width: 50 },
  ];
  companies.getRow(1).font = { bold: true };
  for (const r of rows) {
    companies.addRow({
      name: r.name,
      slug: r.slug,
      website: r.website ?? "",
      verdict: r.verdict,
      hadDescription: r.hadDescription ? "yes" : "no",
      descriptionFilled: r.descriptionFilled ? "yes" : "",
      hadLogo: r.hadLogo ? "yes" : "no",
      logoFilled: r.logoFilled ? "yes" : "",
      logoSource: r.logoSource ?? "",
      wasVerified: r.wasVerified ? "yes" : "no",
      nowVerified: r.nowVerified ? "yes" : "no",
      notes: r.notes,
    });
  }
  companies.autoFilter = { from: "A1", to: "L1" };

  const dir = path.resolve(__dirname, "../reports");
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `bengaluru-verify-${stamp}${DRY_RUN ? "-dryrun" : ""}.xlsx`);
  await wb.xlsx.writeFile(file);
  return file;
}

async function main() {
  const pool = getPool();

  const totalsRes = await pool.query(
    `select count(*) total, count(last_verified_at) verified from brands where city_id = $1`,
    [CITY_ID]
  );
  const totals = { total: Number(totalsRes.rows[0].total), verifiedBefore: Number(totalsRes.rows[0].verified) };

  const { rows: brands } = await pool.query<Brand>(
    `select id, name, slug, website, domain, description, logo_url, last_verified_at
     from brands
     where city_id = $1
       and ($2::boolean or last_verified_at is null)
     order by name
     limit $3`,
    [CITY_ID, REVERIFY_ALL, LIMIT === Infinity ? null : LIMIT]
  );

  console.log(
    `[verify-bengaluru] ${totals.total} brands total, ${totals.verifiedBefore} already reviewed. ` +
      `Processing ${brands.length}${LOGOS_ONLY ? " (logos only)" : ""}${DRY_RUN ? " — DRY RUN, nothing written" : ""}.`
  );

  const srcId = DRY_RUN ? -1 : await sourceId(pool);
  const report: ReportRow[] = [];
  let done = 0;

  await eachConcurrent(brands, CONCURRENCY, async (brand) => {
    const row = await processBrand(pool, brand, srcId);
    report.push(row);
    done++;
    if (done % 50 === 0) console.log(`[verify-bengaluru] ${done}/${brands.length}`);
  });

  const file = await writeReport(report, totals);
  console.log(`\n[verify-bengaluru] done. Report: ${file}`);
  console.log(
    `[verify-bengaluru] reviewed this run: ${report.filter((r) => r.nowVerified && !r.wasVerified).length}, ` +
      `descriptions filled: ${report.filter((r) => r.descriptionFilled).length}, ` +
      `logos filled: ${report.filter((r) => r.logoFilled).length}, ` +
      `still no logo: ${report.filter((r) => !r.hadLogo && !r.logoFilled).length}`
  );

  await pool.end();
}

main().catch((err) => {
  console.error("[verify-bengaluru] fatal", err);
  process.exit(1);
});

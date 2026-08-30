// One-off bulk import of the hand-curated, pre-verified Pune/Mumbai dataset
// (packages/db/seed/curated/pune-mumbai-curated.xlsx).
//
// This deliberately BYPASSES the scrape pipeline's geocode/enrich/score
// steps: every row already carries researched coordinates, a stated
// location_precision, per-field source URLs and a confidence rating, so
// re-deriving any of that would only degrade it. What it does NOT bypass is
// provenance — each row's source URLs still land in field_evidence.
//
// Rerunnable: upserts on (city_id, slug), so a second run updates rather
// than duplicates.
//
//   pnpm --filter services-pipeline import-curated
//   pnpm --filter services-pipeline import-curated -- --dry-run
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { getPool } from "@startup-atlas/db";
import { slugify } from "@startup-atlas/core";
import type { LocPrecision } from "@startup-atlas/core";
import { withRetry } from "./lib/retry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKBOOK = path.resolve(__dirname, "../../../packages/db/seed/curated/pune-mumbai-curated.xlsx");
const SHEET = "All Organizations";
const DRY_RUN = process.argv.includes("--dry-run");

// The sheet uses the literal string "Not available" as its blank marker.
// It becomes NULL in the database: the columns are typed (founded_year is
// an INT), and a sentinel string in `website` would make every downstream
// "do we have a website?" check answer yes. Rendering "Not available" is
// the UI's job — see apps/web components.
const BLANK = "not available";

function text(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined) return null;
  // A cell holding a hyperlink/formula comes back as an object, not a string.
  const raw =
    typeof v === "object" && v !== null && "text" in v
      ? String((v as { text: unknown }).text)
      : typeof v === "object" && v !== null && "result" in v
        ? String((v as { result: unknown }).result)
        : String(v);
  const s = raw.trim();
  if (s === "" || s.toLowerCase() === BLANK) return null;
  return s;
}

function num(v: ExcelJS.CellValue): number | null {
  const s = text(v);
  if (s === null) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

// 'Mumbai, India' and 'Navi Mumbai' both belong to the mumbai city page;
// the finer locality survives in offices.area.
function cityId(raw: string | null): "pune" | "mumbai" | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("pune")) return "pune";
  if (s.includes("mumbai")) return "mumbai";
  return null;
}

function kind(raw: string | null): "startup" | "vc" | "mnc" {
  const s = (raw ?? "").toLowerCase();
  if (s === "vc") return "vc";
  if (s === "mnc") return "mnc";
  return "startup";
}

// Only the values the sheet actually uses ('street', 'city'); anything
// unexpected degrades to 'synthetic' rather than being trusted.
function precision(raw: string | null): LocPrecision {
  const s = (raw ?? "").toLowerCase();
  const allowed: LocPrecision[] = ["exact", "building", "street", "locality", "area", "city", "synthetic"];
  return (allowed as string[]).includes(s) ? (s as LocPrecision) : "synthetic";
}

function domainOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

type Row = {
  recordId: string;
  city: "pune" | "mumbai";
  slug: string;
  name: string;
  kind: "startup" | "vc" | "mnc";
  tagline: string | null;
  description: string | null;
  sector: string | null;
  stage: string | null;
  website: string | null;
  domain: string | null;
  foundedYear: number | null;
  logoUrl: string | null;
  lat: number;
  lng: number;
  precision: LocPrecision;
  area: string | null;
  address: string | null;
  locationSource: string | null;
  careersUrl: string | null;
  careersSourceUrl: string | null;
  primarySourceUrl: string | null;
  confidence: string | null;
  researchedAt: string | null;
};

// Confidence is the curator's own rating, kept verbatim in field_evidence.
// It maps to a score only so the admin UI's ordering stays meaningful.
function scoreFor(confidence: string | null): number {
  return (confidence ?? "").toLowerCase() === "high" ? 90 : 78;
}

async function readRows(): Promise<{ rows: Row[]; skipped: string[] }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(WORKBOOK);
  const ws = wb.getWorksheet(SHEET);
  if (!ws) throw new Error(`sheet "${SHEET}" not found in ${WORKBOOK}`);

  const header = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => header.set(String(cell.value).trim(), col));
  const col = (r: ExcelJS.Row, name: string) => {
    const i = header.get(name);
    return i ? r.getCell(i).value : null;
  };

  const rows: Row[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();

  ws.eachRow((r, i) => {
    if (i === 1) return;

    const recordId = text(col(r, "record_id")) ?? `row-${i}`;
    const name = text(col(r, "name"));
    const city = cityId(text(col(r, "city")));
    const lat = num(col(r, "latitude"));
    const lng = num(col(r, "longitude"));

    // A row without these four can't be a map pin, so it's reported rather
    // than silently coerced into one.
    if (!name || !city || lat === null || lng === null) {
      skipped.push(`${recordId}: missing name/city/coordinates`);
      return;
    }

    const slug = slugify(name);
    const key = `${city}/${slug}`;
    if (seen.has(key)) {
      skipped.push(`${recordId}: duplicate slug "${key}"`);
      return;
    }
    seen.add(key);

    const website = text(col(r, "website"));
    rows.push({
      recordId,
      city,
      slug,
      name,
      kind: kind(text(col(r, "organization_type"))),
      tagline: text(col(r, "tagline")),
      description: text(col(r, "description")),
      sector: text(col(r, "sector")),
      stage: text(col(r, "stage")),
      website,
      domain: domainOf(website),
      foundedYear: num(col(r, "founded_year")),
      logoUrl: text(col(r, "logo_url")),
      lat,
      lng,
      precision: precision(text(col(r, "location_precision"))),
      area: text(col(r, "area")),
      address: text(col(r, "address")),
      locationSource: text(col(r, "location_source_url")),
      careersUrl: text(col(r, "careers_url")),
      careersSourceUrl: text(col(r, "careers_source_url")),
      primarySourceUrl: text(col(r, "primary_source_url")),
      confidence: text(col(r, "confidence")),
      researchedAt: text(col(r, "researched_at")),
    });
  });

  return { rows, skipped };
}

async function importRow(pool: ReturnType<typeof getPool>, row: Row) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const brand = await client.query(
      `INSERT INTO brands (city_id, slug, name, kind, tagline, description, sector, stage,
                           website, domain, founded_year, logo_url, score, status, last_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published',$14)
       ON CONFLICT (city_id, slug) DO UPDATE SET
         name = EXCLUDED.name, kind = EXCLUDED.kind,
         tagline = COALESCE(EXCLUDED.tagline, brands.tagline),
         description = COALESCE(EXCLUDED.description, brands.description),
         sector = COALESCE(EXCLUDED.sector, brands.sector),
         stage = COALESCE(EXCLUDED.stage, brands.stage),
         website = COALESCE(EXCLUDED.website, brands.website),
         domain = COALESCE(EXCLUDED.domain, brands.domain),
         founded_year = COALESCE(EXCLUDED.founded_year, brands.founded_year),
         logo_url = COALESCE(EXCLUDED.logo_url, brands.logo_url),
         score = EXCLUDED.score, status = 'published',
         last_verified_at = EXCLUDED.last_verified_at, updated_at = now()
       RETURNING id`,
      [
        row.city, row.slug, row.name, row.kind, row.tagline, row.description,
        row.sector, row.stage, row.website, row.domain, row.foundedYear,
        row.logoUrl, scoreFor(row.confidence), row.researchedAt,
      ]
    );
    const brandId = brand.rows[0].id as string;

    // Same replace-don't-append rule as steps/upsert.ts: this import is the
    // authority on where the pin goes.
    await client.query(`DELETE FROM offices WHERE brand_id = $1`, [brandId]);
    await client.query(
      `INSERT INTO offices (brand_id, city_id, geom, precision, area, address,
                            is_public_office, location_source, verified_at)
       VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,$6,$7,true,$8,$9)`,
      [brandId, row.city, row.lng, row.lat, row.precision, row.area,
       row.address, row.locationSource, row.researchedAt]
    );

    // A careers page is a public business contact, so it carries its own
    // source_url (the column is NOT NULL for exactly this reason).
    if (row.careersUrl) {
      await client.query(
        `DELETE FROM company_contacts WHERE brand_id = $1 AND type = 'careers'`,
        [brandId]
      );
      await client.query(
        `INSERT INTO company_contacts (brand_id, type, url, is_public, source_url, verified_at)
         VALUES ($1,'careers',$2,true,$3,$4)`,
        [brandId, row.careersUrl, row.careersSourceUrl ?? row.careersUrl, row.researchedAt]
      );
    }

    // Provenance: this is the part of the curated dataset we must not drop.
    await client.query(`DELETE FROM field_evidence WHERE entity = 'brand' AND entity_id = $1`, [brandId]);
    const evidence: Array<[string, string | null, string | null]> = [
      ["name", row.name, row.primarySourceUrl],
      ["website", row.website, text(row.website)],
      ["location", `${row.lat},${row.lng} (${row.precision})`, row.locationSource],
      ["careers_url", row.careersUrl, row.careersSourceUrl],
    ];
    for (const [field, value, sourceUrl] of evidence) {
      if (!value || !sourceUrl) continue;
      await client.query(
        `INSERT INTO field_evidence (entity, entity_id, field, value, source_url, confidence)
         VALUES ('brand',$1,$2,$3,$4,$5)`,
        [brandId, field, value, sourceUrl, scoreFor(row.confidence)]
      );
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  const { rows, skipped } = await readRows();

  const byCity = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.city] = (acc[r.city] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[import-curated] parsed ${rows.length} rows`, byCity);
  if (skipped.length) {
    console.warn(`[import-curated] skipped ${skipped.length}:`);
    for (const s of skipped.slice(0, 20)) console.warn(`  - ${s}`);
    if (skipped.length > 20) console.warn(`  ... and ${skipped.length - 20} more`);
  }

  if (DRY_RUN) {
    console.log("[import-curated] --dry-run, nothing written");
    console.log("[import-curated] sample:", JSON.stringify(rows[0], null, 2));
    return;
  }

  const pool = getPool();
  let done = 0;
  for (const row of rows) {
    await withRetry(() => importRow(pool, row));
    if (++done % 100 === 0) console.log(`[import-curated] ${done}/${rows.length}`);
  }
  console.log(`[import-curated] imported ${done} rows`);
  await pool.end();
}

main().catch((err) => {
  console.error("[import-curated] fatal", err);
  process.exit(1);
});

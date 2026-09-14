// Bulk import of bangalorestartupmap.com's public listing into Bengaluru.
//
//   pnpm --filter services-pipeline run import-bsm -- --dry-run --limit=20
//   pnpm --filter services-pipeline run import-bsm
//   pnpm --filter services-pipeline run import-bsm -- --skip-jobs
//
// Deliberately a "load it now, verify later" import: every company lands as
// 'published' regardless of score, with last_verified_at left NULL (so no
// verified badge) and every copied field recorded in field_evidence against
// the listing page it came from — which is what lets verify-listings and
// the scraping pipeline find and re-check these rows afterwards.
//
// What is copied:
//   * the homepage's embedded company list (name, kind, tagline, description,
//     stage, sector, tags, area, location text, coordinates, website,
//     founders + LinkedIn links, founded year) — one request
//   * each company page's open roles (title, apply URL, posted date) — one
//     request per company, a few at a time
//   * the homepage's linked news items
// What is not: their hosted logo files (run `cache-logos` afterwards, which
// fetches each company's own logo by domain) and the per-company role
// counts on the homepage (the company pages carry the real postings).
//
// Pin precision is never taken on trust (CLAUDE.md golden rule):
//   * a coordinate shared by 2+ companies is a cluster point -> 'area'
//   * a unique coordinate with >=5 decimals -> 'street', fewer -> 'locality'
//   * no coordinate -> our own locality centre for its area ('area'), else
//     the city centre ('synthetic')
// The location text goes to offices.address, which only the admin panel
// shows — some of it is a registered address, never rendered publicly.
//
// Rerunnable: brands upsert on (city_id, slug), jobs on apply_url, news on url.
import { getPool } from "@startup-atlas/db";
import { cities } from "@startup-atlas/config";
import { slugify } from "@startup-atlas/core";
import type { LocPrecision } from "@startup-atlas/core";
import { inferSeniority, inferTrack } from "./lib/job_classify";
import { isWalkinTitle } from "./lib/walkin";
import { withRetry } from "./lib/retry";

const BASE_URL = "https://www.bangalorestartupmap.com";
const SOURCE_NAME = "bangalorestartupmap";
const CITY_ID = "bengaluru";
const USER_AGENT = "Mozilla/5.0 (compatible; startup-atlas/0.1)";
const PAGE_CONCURRENCY = 3;
const DB_CONCURRENCY = 4;
const PAGE_DELAY_MS = 300; // per worker, between company page fetches
const POSTING_TTL = "30 days"; // same as steps/refresh_jobs.ts
const EVIDENCE_CONFIDENCE = 40; // copied from a third-party directory, unverified

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_JOBS = process.argv.includes("--skip-jobs");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.slice("--limit=".length)) : Infinity;

type SourceCompany = {
  name: string;
  slug: string;
  kind: string | null;
  tagline: string | null;
  description: string | null;
  stage: string | null;
  sector: string | null;
  tags: string[] | null;
  area: string | null;
  hsr_location: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  founders: string | null;
  founder_links: Array<{ name: string; url: string }> | null;
  founded_year: number | null;
};

type SourceRole = {
  id: string;
  title: string | null;
  apply_url: string | null;
  posted_at: string | null;
};

type SourceNews = {
  title: string;
  url: string;
  source: string | null;
  category: string | null;
  published_at: string | null;
  company_slug: string | null;
};

// ---- page parsing -----------------------------------------------------

// Next.js App Router pages embed their data as chunks pushed onto
// self.__next_f; each chunk is a JSON string literal. Joined, they're the
// RSC payload the data arrays below live in.
function decodeRscPayload(html: string): string {
  const marker = "self.__next_f.push([1,";
  const parts: string[] = [];
  let i = 0;
  while ((i = html.indexOf(marker, i)) !== -1) {
    const start = i + marker.length;
    const end = html.indexOf("])</script>", start);
    if (end === -1) break;
    try {
      parts.push(JSON.parse(html.slice(start, end)) as string);
    } catch {
      // A non-string chunk (e.g. a [2,...] form-state push) — not data.
    }
    i = end;
  }
  return parts.join("");
}

// Pulls the JSON array that follows `"key":` by bracket matching, since the
// payload around it is RSC wire format, not JSON.
function extractJsonArray<T>(payload: string, key: string, from = 0): T[] | null {
  const at = payload.indexOf(`"${key}":[`, from);
  if (at === -1) return null;
  const start = payload.indexOf("[", at);
  let depth = 0;
  let inString = false;
  for (let i = start; i < payload.length; i++) {
    const c = payload[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === "[" || c === "{") depth++;
    else if (c === "]" || c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(payload.slice(start, i + 1)) as T[];
    }
  }
  return null;
}

// RSC encodes `undefined` as the string "$undefined"; blanks are "".
function clean<T>(value: T): T {
  if (value === "$undefined" || value === "") return null as T;
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)])) as T;
  }
  return value;
}

async function fetchText(url: string): Promise<string> {
  return withRetry(async () => {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    return res.text();
  });
}

async function fetchRoles(slug: string): Promise<SourceRole[]> {
  const payload = decodeRscPayload(await fetchText(`${BASE_URL}/company/${slug}`));
  const slugAt = payload.indexOf(`"slug":"${slug}","roles":`);
  if (slugAt === -1) return [];
  return clean(extractJsonArray<SourceRole>(payload, "roles", slugAt) ?? []);
}

// ---- mapping -----------------------------------------------------------

function domainOf(website: string | null): string | null {
  if (!website) return null;
  try {
    return new URL(website).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function decimals(n: number): number {
  return String(n).split(".")[1]?.length ?? 0;
}

type Pin = { lat: number; lng: number; precision: LocPrecision; source: string };

function pinFor(c: SourceCompany, sharedCoords: Set<string>): Pin {
  const city = cities.find((x) => x.id === CITY_ID)!;
  if (typeof c.lat === "number" && typeof c.lng === "number") {
    const precision: LocPrecision = sharedCoords.has(`${c.lat},${c.lng}`)
      ? "area"
      : decimals(c.lat) >= 5
        ? "street"
        : "locality";
    return { lat: c.lat, lng: c.lng, precision, source: `${BASE_URL}/company/${c.slug}` };
  }
  const known = city.areas?.find((a) => a.name.toLowerCase() === (c.area ?? "").toLowerCase());
  if (known) return { lat: known.lat, lng: known.lng, precision: "area", source: "area-centroid-fallback" };
  return { lat: city.centerLat, lng: city.centerLng, precision: "synthetic", source: "city-centroid-fallback" };
}

// "Bengaluru" as an area is just the city — leave the area empty instead.
function areaFor(c: SourceCompany): string | null {
  if (!c.area) return null;
  return cities.some((x) => x.id === CITY_ID && [x.name, ...x.aliases].includes(c.area!)) ? null : c.area;
}

// ---- writes ------------------------------------------------------------

type Pool = ReturnType<typeof getPool>;

async function sourceId(pool: Pool): Promise<number> {
  const existing = await pool.query(`select id from sources where name = $1 limit 1`, [SOURCE_NAME]);
  if (existing.rows[0]) return existing.rows[0].id as number;
  const inserted = await pool.query(
    `insert into sources (name, kind, base_url) values ($1, 'directory', $2) returning id`,
    [SOURCE_NAME, BASE_URL]
  );
  return inserted.rows[0].id as number;
}

async function importCompany(pool: Pool, c: SourceCompany, slug: string, pin: Pin, srcId: number): Promise<string> {
  const pageUrl = `${BASE_URL}/company/${c.slug}`;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const brand = await client.query(
      `INSERT INTO brands (city_id, slug, name, kind, tagline, description, sector, stage, tags,
                           website, domain, founded_year, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published')
       ON CONFLICT (city_id, slug) DO UPDATE SET
         name = EXCLUDED.name, kind = EXCLUDED.kind,
         tagline = COALESCE(EXCLUDED.tagline, brands.tagline),
         description = COALESCE(EXCLUDED.description, brands.description),
         sector = COALESCE(EXCLUDED.sector, brands.sector),
         stage = COALESCE(EXCLUDED.stage, brands.stage),
         tags = CASE WHEN cardinality(EXCLUDED.tags) > 0 THEN EXCLUDED.tags ELSE brands.tags END,
         website = COALESCE(EXCLUDED.website, brands.website),
         domain = COALESCE(EXCLUDED.domain, brands.domain),
         founded_year = COALESCE(EXCLUDED.founded_year, brands.founded_year),
         status = 'published', updated_at = now()
       RETURNING id`,
      [
        CITY_ID, slug, c.name, c.kind === "vc" ? "vc" : "startup", c.tagline, c.description,
        c.sector, c.stage, c.tags ?? [], c.website, domainOf(c.website), c.founded_year,
      ]
    );
    const brandId = brand.rows[0].id as string;

    await client.query(`DELETE FROM offices WHERE brand_id = $1`, [brandId]);
    await client.query(
      `INSERT INTO offices (brand_id, city_id, geom, precision, area, address, is_public_office, location_source)
       VALUES ($1,$2,ST_SetSRID(ST_MakePoint($3,$4),4326),$5,$6,$7,false,$8)`,
      [brandId, CITY_ID, pin.lng, pin.lat, pin.precision, areaFor(c), c.hsr_location, pin.source]
    );

    // Founders: LinkedIn-linked ones first, then any names only listed as text.
    const founders = new Map<string, string | null>();
    for (const f of c.founder_links ?? []) if (f?.name) founders.set(f.name.trim(), f.url ?? null);
    for (const name of (c.founders ?? "").split(",")) {
      const n = name.trim();
      if (n && !founders.has(n)) founders.set(n, null);
    }
    // A LinkedIn URL identifies a person across companies; a bare name only
    // within this company (two "Rahul Sharma"s elsewhere aren't the same
    // person), so name-only founders are matched against this brand's
    // existing founders — which keeps reruns from duplicating people rows.
    const previous = await client.query(
      `select p.id, p.name from company_people cp join people p on p.id = cp.person_id
       where cp.brand_id = $1 and cp.role = 'founder'`,
      [brandId]
    );
    const previousByName = new Map(previous.rows.map((r) => [r.name as string, r.id as string]));
    await client.query(`DELETE FROM company_people WHERE brand_id = $1 AND role = 'founder'`, [brandId]);
    for (const [name, linkedin] of founders) {
      const byLinkedin = linkedin
        ? ((await client.query(`select id from people where linkedin = $1 limit 1`, [linkedin])).rows[0]?.id as
            | string
            | undefined)
        : undefined;
      const personId =
        byLinkedin ??
        previousByName.get(name) ??
        ((await client.query(`insert into people (name, linkedin) values ($1,$2) returning id`, [name, linkedin]))
          .rows[0].id as string);
      await client.query(
        `insert into company_people (brand_id, person_id, role) values ($1,$2,'founder') on conflict do nothing`,
        [brandId, personId]
      );
    }

    await client.query(
      `DELETE FROM field_evidence WHERE entity = 'brand' AND entity_id = $1 AND source_id = $2`,
      [brandId, srcId]
    );
    const evidence: Array<[string, string | null]> = [
      ["name", c.name],
      ["website", c.website],
      ["description", c.description],
      ["stage", c.stage],
      ["sector", c.sector],
      ["founded_year", c.founded_year != null ? String(c.founded_year) : null],
      ["location", `${pin.lat},${pin.lng} (${pin.precision}) ${c.hsr_location ?? ""}`.trim()],
      ["founders", founders.size ? [...founders.keys()].join(", ") : null],
    ];
    for (const [field, value] of evidence) {
      if (!value) continue;
      await client.query(
        `INSERT INTO field_evidence (entity, entity_id, field, value, source_id, source_url, confidence)
         VALUES ('brand',$1,$2,$3,$4,$5,$6)`,
        [brandId, field, value, srcId, pageUrl, EVIDENCE_CONFIDENCE]
      );
    }

    await client.query("COMMIT");
    return brandId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function importRoles(pool: Pool, brandId: string, companySlug: string, roles: SourceRole[]): Promise<number> {
  const rows = roles.filter((r) => r.title && r.apply_url);
  if (rows.length === 0) return 0;
  const pageUrl = `${BASE_URL}/company/${companySlug}`;
  const titles = rows.map((r) => r.title!);
  const classified = titles.map((t) => inferSeniority(t));
  await pool.query(
    `insert into job_postings
       (brand_id, city_id, title, track, seniority, fresher_friendly, apply_url, source_url, posted_at, is_walkin, expires_at)
     select $1, $2, t.title, t.track, t.seniority, t.fresher, t.apply_url, $3, t.posted_at, t.walkin,
            now() + interval '${POSTING_TTL}'
     from unnest($4::text[], $5::text[], $6::text[], $7::boolean[], $8::text[], $9::timestamptz[], $10::boolean[])
       as t(title, track, seniority, fresher, apply_url, posted_at, walkin)
     on conflict (apply_url) do update set
       title = excluded.title, track = excluded.track, seniority = excluded.seniority,
       fresher_friendly = excluded.fresher_friendly, posted_at = excluded.posted_at,
       is_walkin = excluded.is_walkin, expires_at = excluded.expires_at`,
    [
      brandId, CITY_ID, pageUrl,
      titles,
      titles.map((t) => inferTrack(t)),
      classified.map((c) => c.seniority),
      classified.map((c) => c.fresherFriendly),
      rows.map((r) => r.apply_url!),
      rows.map((r) => r.posted_at),
      titles.map((t) => isWalkinTitle(t)),
    ]
  );
  await pool.query(`update brands set hiring = true where id = $1`, [brandId]);
  return rows.length;
}

async function importNews(pool: Pool, news: SourceNews[], brandIdsBySourceSlug: Map<string, string>): Promise<number> {
  let linked = 0;
  for (const n of news) {
    if (!n.title || !n.url) continue;
    const article = await pool.query(
      `insert into news_articles (title, url, source, category, published_at) values ($1,$2,$3,$4,$5)
       on conflict (url) do update set title = excluded.title
       returning id`,
      [n.title, n.url, n.source, n.category, n.published_at]
    );
    const brandId = n.company_slug ? brandIdsBySourceSlug.get(n.company_slug) : undefined;
    if (brandId) {
      await pool.query(`insert into company_news (brand_id, article_id) values ($1,$2) on conflict do nothing`, [
        brandId,
        article.rows[0].id,
      ]);
      linked++;
    }
  }
  return linked;
}

async function eachConcurrent<T>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        await fn(items[i], i);
      }
    })
  );
}

// ---- main --------------------------------------------------------------

async function main() {
  const startedAt = new Date();
  console.log(`[bsm] fetching ${BASE_URL}/ ...`);
  const payload = decodeRscPayload(await fetchText(`${BASE_URL}/`));
  const allCompanies = clean(extractJsonArray<SourceCompany>(payload, "startups") ?? []);
  const news = clean(extractJsonArray<SourceNews>(payload, "news") ?? []);
  if (allCompanies.length === 0) throw new Error("no company list found on the homepage — page structure may have changed");

  const companies = allCompanies.slice(0, LIMIT);
  console.log(`[bsm] found ${allCompanies.length} companies, ${news.length} news items; importing ${companies.length}`);

  // Coordinates counted across the whole list, not just the --limit slice,
  // so a cluster point is recognized even in a small test run.
  const coordCounts = new Map<string, number>();
  for (const c of allCompanies) {
    if (typeof c.lat === "number") coordCounts.set(`${c.lat},${c.lng}`, (coordCounts.get(`${c.lat},${c.lng}`) ?? 0) + 1);
  }
  const sharedCoords = new Set([...coordCounts].filter(([, n]) => n > 1).map(([k]) => k));

  // Our slug is slugify(name), same as every other importer, so later
  // pipeline runs recognize these rows; their slug is kept for page URLs.
  const seen = new Set<string>();
  const planned = companies.map((c) => {
    let slug = slugify(c.name) || c.slug;
    if (seen.has(slug)) slug = c.slug;
    seen.add(slug);
    return { c, slug, pin: pinFor(c, sharedCoords) };
  });

  const tally = (f: (p: (typeof planned)[number]) => string) =>
    planned.reduce<Record<string, number>>((acc, p) => ((acc[f(p)] = (acc[f(p)] ?? 0) + 1), acc), {});
  console.log("[bsm] pin precision:", tally((p) => p.pin.precision));
  console.log("[bsm] kind:", tally((p) => (p.c.kind === "vc" ? "vc" : "startup")));

  if (DRY_RUN) {
    const sample = planned[0];
    const roles = SKIP_JOBS || !sample ? [] : await fetchRoles(sample.c.slug);
    console.log("[bsm] --dry-run, nothing written. sample company:", JSON.stringify({ ...sample, roles: roles.slice(0, 3), openRoles: roles.length }, null, 2));
    return;
  }

  const pool = getPool();
  const srcId = await sourceId(pool);
  const brandIdsBySourceSlug = new Map<string, string>();
  let failed = 0;

  await eachConcurrent(planned, DB_CONCURRENCY, async ({ c, slug, pin }, i) => {
    try {
      const id = await withRetry(() => importCompany(pool, c, slug, pin, srcId));
      brandIdsBySourceSlug.set(c.slug, id);
    } catch (err) {
      failed++;
      console.error(`[bsm] company ${c.name} failed: ${(err as Error).message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`[bsm] companies ${i + 1}/${planned.length}`);
  });
  console.log(`[bsm] companies imported: ${brandIdsBySourceSlug.size} (failed ${failed})`);

  let jobs = 0;
  let jobPagesFailed = 0;
  if (!SKIP_JOBS) {
    const withIds = planned.filter((p) => brandIdsBySourceSlug.has(p.c.slug));
    await eachConcurrent(withIds, PAGE_CONCURRENCY, async ({ c }, i) => {
      try {
        const roles = await fetchRoles(c.slug);
        jobs += await withRetry(() => importRoles(pool, brandIdsBySourceSlug.get(c.slug)!, c.slug, roles));
      } catch (err) {
        jobPagesFailed++;
        console.error(`[bsm] jobs for ${c.name} failed: ${(err as Error).message}`);
      }
      if ((i + 1) % 100 === 0) console.log(`[bsm] company pages ${i + 1}/${withIds.length}, jobs so far ${jobs}`);
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    });
    console.log(`[bsm] jobs imported: ${jobs} (company pages failed ${jobPagesFailed})`);
  }

  const newsLinked = await importNews(pool, news, brandIdsBySourceSlug);
  console.log(`[bsm] news items linked to companies: ${newsLinked}`);

  await pool.query(
    `INSERT INTO ingestion_runs (city_id, source, started_at, finished_at, found, upserted, needs_review, notes)
     VALUES ($1,$2,$3,now(),$4,$5,0,$6)`,
    [
      CITY_ID, SOURCE_NAME, startedAt, allCompanies.length, brandIdsBySourceSlug.size,
      `jobs=${jobs} news_linked=${newsLinked} company_failures=${failed} job_page_failures=${jobPagesFailed}`,
    ]
  );
  await pool.end();
  console.log("[bsm] done. Next: run cache-logos for logos; the city snapshot cache refreshes within 5 minutes.");
}

main().catch((err) => {
  console.error("[bsm] fatal", err);
  process.exit(1);
});

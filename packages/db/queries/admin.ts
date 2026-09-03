import type { ReviewStatus } from "@startup-atlas/core";
import { getPool } from "../index";

export type AdminBrandRow = {
  id: string;
  cityId: string;
  slug: string;
  name: string;
  sector: string | null;
  stage: string | null;
  score: number;
  status: ReviewStatus;
  website: string | null;
  precision: string | null;
  createdAt: string;
};

// The only place allowed to read review/archived rows — everything
// public-facing stays on queries/brands.ts's published/probable filter.
export async function getBrandsByStatus(status: ReviewStatus): Promise<AdminBrandRow[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select b.id, b.city_id, b.slug, b.name, b.sector, b.stage, b.score, b.status,
            b.website, o.precision, b.created_at
     from brands b
     left join offices o on o.brand_id = b.id
     where b.status = $1
     order by b.score desc, b.created_at desc`,
    [status]
  );
  return rows.map((r) => ({
    id: r.id,
    cityId: r.city_id,
    slug: r.slug,
    name: r.name,
    sector: r.sector,
    stage: r.stage,
    score: r.score,
    status: r.status,
    website: r.website,
    precision: r.precision,
    createdAt: r.created_at,
  }));
}

// Used right before a bulk publish (lib/admin/actions.ts's approveBrands)
// to figure out which of the brands being approved still need a logo
// auto-fetched — never fetch/upload for a brand that already has one.
export async function getBrandsLogoInfo(
  ids: string[]
): Promise<Array<{ id: string; domain: string | null; logoUrl: string | null }>> {
  if (ids.length === 0) return [];
  const pool = getPool();
  const { rows } = await pool.query(`select id, domain, logo_url from brands where id = any($1)`, [ids]);
  return rows.map((r) => ({ id: r.id, domain: r.domain, logoUrl: r.logo_url }));
}

// Bulk browse/search across every brand regardless of status — the gap
// BUILD_PLAN.md's Phase 4 status note flagged as "not built this pass."
// This is where an admin corrects what the pipeline got wrong (bad
// geocode, wrong sector), not just approve/archive the review queue.
export async function searchBrands(filters: {
  cityId?: string;
  status?: ReviewStatus;
  query?: string;
  limit: number;
  offset: number;
}): Promise<{ rows: AdminBrandRow[]; total: number }> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.cityId) {
    params.push(filters.cityId);
    conditions.push(`b.city_id = $${params.length}`);
  }
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`b.status = $${params.length}`);
  }
  if (filters.query) {
    params.push(`%${filters.query}%`);
    conditions.push(`b.name ilike $${params.length}`);
  }
  const where = conditions.length ? `where ${conditions.join(" and ")}` : "";

  const { rows: countRows } = await pool.query(`select count(*)::int as total from brands b ${where}`, params);

  params.push(filters.limit, filters.offset);
  const { rows } = await pool.query(
    `select b.id, b.city_id, b.slug, b.name, b.sector, b.stage, b.score, b.status,
            b.website, o.precision, b.created_at
     from brands b
     left join offices o on o.brand_id = b.id
     ${where}
     order by b.created_at desc
     limit $${params.length - 1} offset $${params.length}`,
    params
  );

  return {
    total: countRows[0].total as number,
    rows: rows.map((r) => ({
      id: r.id,
      cityId: r.city_id,
      slug: r.slug,
      name: r.name,
      sector: r.sector,
      stage: r.stage,
      score: r.score,
      status: r.status,
      website: r.website,
      precision: r.precision,
      createdAt: r.created_at,
    })),
  };
}

export type AdminBrandDetail = {
  id: string;
  cityId: string;
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
  hiring: boolean;
  logoUrl: string | null;
  score: number;
  status: ReviewStatus;
  precision: string | null;
  area: string | null;
  address: string | null;
};

export async function getBrandForAdmin(id: string): Promise<AdminBrandDetail | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select b.id, b.city_id, b.slug, b.name, b.kind, b.tagline, b.description, b.sector, b.stage,
            b.website, b.domain, b.founded_year, b.hiring, b.logo_url, b.score, b.status,
            o.precision, o.area, o.address
     from brands b
     left join offices o on o.brand_id = b.id
     where b.id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    cityId: r.city_id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    tagline: r.tagline,
    description: r.description,
    sector: r.sector,
    stage: r.stage,
    website: r.website,
    domain: r.domain,
    foundedYear: r.founded_year,
    hiring: r.hiring,
    logoUrl: r.logo_url,
    score: r.score,
    status: r.status,
    precision: r.precision,
    area: r.area,
    address: r.address,
  };
}

// Admin corrections to the facts the pipeline scraped — never a raw status
// override (that stays derived from tierFromScore, per BUILD_PLAN.md's
// non-negotiables). Fixing a wrong sector or adding a missing founded_year
// here can legitimately move a brand up a tier; the caller (server action)
// recomputes score/status from these same fields via
// @startup-atlas/core's scoreRecord/tierFromScore right after this call.
export async function updateBrandFacts(
  id: string,
  fields: {
    name: string;
    tagline: string | null;
    description: string | null;
    sector: string | null;
    stage: string | null;
    website: string | null;
    domain: string | null;
    foundedYear: number | null;
    hiring: boolean;
    kind: "startup" | "vc" | "mnc";
  },
  score: number,
  status: ReviewStatus
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `update brands set
       name=$2, tagline=$3, description=$4, sector=$5, stage=$6, website=$7, domain=$8,
       founded_year=$9, hiring=$10, kind=$11, score=$12, status=$13, updated_at=now()
     where id=$1`,
    [
      id,
      fields.name,
      fields.tagline,
      fields.description,
      fields.sector,
      fields.stage,
      fields.website,
      fields.domain,
      fields.foundedYear,
      fields.hiring,
      fields.kind,
      score,
      status,
    ]
  );
}

export async function setBrandStatus(id: string, status: ReviewStatus): Promise<void> {
  const pool = getPool();
  await pool.query(`update brands set status=$2, updated_at=now() where id=$1`, [id, status]);
}

export async function setBrandStatusBulk(ids: string[], status: ReviewStatus): Promise<void> {
  if (ids.length === 0) return;
  const pool = getPool();
  await pool.query(`update brands set status=$2, updated_at=now() where id = any($1)`, [ids, status]);
}

export async function getStatusCounts(): Promise<Record<string, number>> {
  const pool = getPool();
  const { rows } = await pool.query(`select status, count(*)::int as count from brands group by status`);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status as string] = r.count as number;
  return out;
}

// First-party analytics (CLAUDE.md §10: "own page_views table = first-party
// truth the admin panel can read for /stats"). No cookies, no client id —
// just a path + referrer + day, enough for a rough traffic shape without
// needing PostHog/Cloudflare Analytics set up first.
export async function insertPageView(input: {
  cityId?: string | null;
  path: string;
  referrer?: string | null;
  event?: string | null;
}): Promise<void> {
  const pool = getPool();
  await pool.query(`insert into page_views (city_id, path, referrer, event) values ($1,$2,$3,$4)`, [
    input.cityId ?? null,
    input.path,
    input.referrer ?? null,
    input.event ?? "pageview",
  ]);
}

export async function getPageViewStats(days = 7): Promise<{ totalViews: number; byDay: Array<{ day: string; count: number }>; topPaths: Array<{ path: string; count: number }> }> {
  const pool = getPool();
  const [totalResult, byDayResult, topPathsResult] = await Promise.all([
    pool.query(`select count(*)::int as total from page_views where created_at > now() - ($1 || ' days')::interval`, [days]),
    pool.query(
      `select day::text, count(*)::int as count from page_views
       where created_at > now() - ($1 || ' days')::interval
       group by day order by day asc`,
      [days]
    ),
    pool.query(
      `select path, count(*)::int as count from page_views
       where created_at > now() - ($1 || ' days')::interval
       group by path order by count desc limit 10`,
      [days]
    ),
  ]);
  return {
    totalViews: totalResult.rows[0]?.total ?? 0,
    byDay: byDayResult.rows.map((r) => ({ day: r.day, count: r.count })),
    topPaths: topPathsResult.rows.map((r) => ({ path: r.path, count: r.count })),
  };
}

export async function getRecentIngestionRuns(limit = 20) {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, city_id, source, started_at, finished_at, found, upserted, needs_review, notes
     from ingestion_runs
     order by id desc
     limit $1`,
    [limit]
  );
  return rows as Array<{
    id: number;
    city_id: string;
    source: string;
    started_at: string;
    finished_at: string | null;
    found: number;
    upserted: number;
    needs_review: number;
    notes: string | null;
  }>;
}

export type SubmissionRow = {
  id: number;
  cityId: string;
  name: string;
  website: string | null;
  tagline: string | null;
  stage: string | null;
  hiring: boolean | null;
  jobsUrl: string | null;
  email: string | null;
  raw: unknown;
  status: string;
  kind: "new" | "edit";
  targetBrandId: string | null;
  createdAt: string;
};

export async function getSubmissions(status = "pending"): Promise<SubmissionRow[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, city_id, name, website, tagline, stage, hiring, jobs_url, email, raw, status,
            kind, target_brand_id, created_at
     from submissions
     where status = $1
     order by created_at desc`,
    [status]
  );
  return rows.map((r) => ({
    id: r.id,
    cityId: r.city_id,
    name: r.name,
    website: r.website,
    tagline: r.tagline,
    stage: r.stage,
    hiring: r.hiring,
    jobsUrl: r.jobs_url,
    email: r.email,
    raw: r.raw,
    status: r.status,
    kind: r.kind,
    targetBrandId: r.target_brand_id,
    createdAt: r.created_at,
  }));
}

export async function getSubmissionById(id: number): Promise<SubmissionRow | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, city_id, name, website, tagline, stage, hiring, jobs_url, email, raw, status,
            kind, target_brand_id, created_at
     from submissions
     where id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    cityId: r.city_id,
    name: r.name,
    website: r.website,
    tagline: r.tagline,
    stage: r.stage,
    hiring: r.hiring,
    jobsUrl: r.jobs_url,
    email: r.email,
    raw: r.raw,
    status: r.status,
    kind: r.kind,
    targetBrandId: r.target_brand_id,
    createdAt: r.created_at,
  };
}

// Turns an approved 'new' submission into a real, honestly-scored brand row
// — the gap BUILD_PLAN.md Phase 4 flagged ("doesn't create a brand row
// yet"). No address is collected on /submit, so the office always lands as
// an honest `synthetic` city-centroid pin — the caller passes the centroid
// in (packages/db has no dependency on packages/config, by design: see
// Part 1 of BUILD_PLAN.md). Status is always derived from tierFromScore,
// never hand-set, same as every other path that writes to `brands`.
export async function convertSubmissionToBrand(
  submission: SubmissionRow,
  centroid: { lat: number; lng: number }
): Promise<{ brandId: string; slug: string; domain: string | null }> {
  const pool = getPool();

  const { scoreRecord, tierFromScore, slugify } = await import("@startup-atlas/core");

  let domain: string | null = null;
  if (submission.website) {
    try {
      domain = new URL(submission.website).hostname.replace(/^www\./, "");
    } catch {
      domain = null;
    }
  }

  const baseSlug = slugify(submission.name);
  let slug = baseSlug;
  for (let i = 2; i < 50; i++) {
    const { rows } = await pool.query(
      `select 1 from brands where city_id = $1 and slug = $2`,
      [submission.cityId, slug]
    );
    if (rows.length === 0) break;
    slug = `${baseSlug}-${i}`;
  }

  // sector/area ride along in the submission's raw JSON rather than getting
  // their own columns — same carrier the logo already uses, so /submit can
  // collect them with no migration. Both are what the submitter told us,
  // which is exactly why they only take effect once a human has approved
  // the submission (this function).
  const raw = submission.raw as { sector?: string; area?: string } | null;
  const sector = raw?.sector?.trim() || null;
  const area = raw?.area?.trim() || null;

  // If the submitter named an area we already have geocoded offices in, put
  // the pin at that area's centroid (averaged from those offices) and label
  // it `area` — honestly what it is. Without a match we fall back to the
  // city centroid at `synthetic`, same as before; the area string is still
  // recorded either way so the profile and the admin can show it.
  let placement = { lng: centroid.lng, lat: centroid.lat, precision: "synthetic" as string };
  if (area) {
    const { rows: areaRows } = await pool.query(
      `select ST_X(ST_Centroid(ST_Collect(geom))) as lng, ST_Y(ST_Centroid(ST_Collect(geom))) as lat
       from offices
       where city_id = $1 and lower(area) = lower($2) and geom is not null`,
      [submission.cityId, area]
    );
    const match = areaRows[0];
    if (match?.lng != null && match?.lat != null) {
      placement = { lng: Number(match.lng), lat: Number(match.lat), precision: "area" };
    }
  }

  const score = scoreRecord({
    hasWebsite: !!submission.website,
    hasDomain: !!domain,
    hasSector: !!sector,
    hasStage: !!submission.stage,
    descriptionLength: submission.tagline?.length ?? 0,
    hasFoundedYear: false,
    precision: placement.precision as Parameters<typeof scoreRecord>[0]["precision"],
    seenInSourceCount: 1,
  });
  const status = tierFromScore(score);

  const { rows: brandRows } = await pool.query(
    `insert into brands
       (city_id, slug, name, kind, tagline, sector, stage, tags, website, domain,
        hiring, score, status, last_verified_at)
     values ($1,$2,$3,'startup',$4,$5,$6,'{}',$7,$8,$9,$10,$11, now())
     returning id`,
    [
      submission.cityId,
      slug,
      submission.name,
      submission.tagline,
      sector,
      submission.stage,
      submission.website,
      domain,
      submission.hiring ?? false,
      score,
      status,
    ]
  );
  const brandId = brandRows[0].id as string;

  await pool.query(
    `insert into offices (brand_id, city_id, geom, precision, area, is_public_office, location_source)
     values ($1,$2, ST_SetSRID(ST_MakePoint($3,$4),4326), $5, $6, false, 'public-submission')`,
    [brandId, submission.cityId, placement.lng, placement.lat, placement.precision, area]
  );

  if (submission.jobsUrl) {
    await pool.query(
      `insert into company_contacts (brand_id, type, url, is_public, source_url)
       values ($1,'careers',$2,true,$2)`,
      [brandId, submission.jobsUrl]
    );
  }

  return { brandId, slug, domain };
}

export async function setBrandLogoUrl(brandId: string, logoUrl: string): Promise<void> {
  const pool = getPool();
  await pool.query(`update brands set logo_url = $2, updated_at = now() where id = $1`, [brandId, logoUrl]);
}

// Applies an approved 'edit' submission's changed fields onto the brand it
// targets — only overwrites fields the submitter actually filled in
// (COALESCE-style: an edit request leaving a field blank never blanks out
// what's already known), same non-destructive philosophy as the pipeline's
// upsert step.
export async function applyEditSubmission(submission: SubmissionRow): Promise<void> {
  if (!submission.targetBrandId) return;
  const pool = getPool();
  await pool.query(
    `update brands set
       tagline = coalesce($2, tagline),
       stage = coalesce($3, stage),
       website = coalesce($4, website),
       hiring = coalesce($5, hiring),
       updated_at = now()
     where id = $1`,
    [
      submission.targetBrandId,
      submission.tagline,
      submission.stage,
      submission.website,
      submission.hiring,
    ]
  );
  if (submission.jobsUrl) {
    await pool.query(
      `insert into company_contacts (brand_id, type, url, is_public, source_url)
       values ($1,'careers',$2,true,$2)
       on conflict do nothing`,
      [submission.targetBrandId, submission.jobsUrl]
    );
  }
}

export async function setSubmissionStatus(id: number, status: string): Promise<void> {
  const pool = getPool();
  await pool.query(`update submissions set status=$2 where id=$1`, [id, status]);
}

export async function createSubmission(input: {
  cityId: string;
  name: string;
  website?: string | null;
  tagline?: string | null;
  stage?: string | null;
  hiring?: boolean | null;
  jobsUrl?: string | null;
  email?: string | null;
  raw: unknown;
  kind?: "new" | "edit";
  targetBrandId?: string | null;
}): Promise<{ id: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    `insert into submissions (city_id, name, website, tagline, stage, hiring, jobs_url, email, raw, kind, target_brand_id)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     returning id`,
    [
      input.cityId,
      input.name,
      input.website ?? null,
      input.tagline ?? null,
      input.stage ?? null,
      input.hiring ?? null,
      input.jobsUrl ?? null,
      input.email ?? null,
      JSON.stringify(input.raw),
      input.kind ?? "new",
      input.targetBrandId ?? null,
    ]
  );
  return { id: rows[0].id };
}

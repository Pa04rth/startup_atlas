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

  const score = scoreRecord({
    hasWebsite: !!submission.website,
    hasDomain: !!domain,
    hasSector: false,
    hasStage: !!submission.stage,
    descriptionLength: submission.tagline?.length ?? 0,
    hasFoundedYear: false,
    precision: "synthetic",
    seenInSourceCount: 1,
  });
  const status = tierFromScore(score);

  const { rows: brandRows } = await pool.query(
    `insert into brands
       (city_id, slug, name, kind, tagline, sector, stage, tags, website, domain,
        hiring, score, status, last_verified_at)
     values ($1,$2,$3,'startup',$4,null,$5,'{}',$6,$7,$8,$9,$10, now())
     returning id`,
    [
      submission.cityId,
      slug,
      submission.name,
      submission.tagline,
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
    `insert into offices (brand_id, city_id, geom, precision, is_public_office, location_source)
     values ($1,$2, ST_SetSRID(ST_MakePoint($3,$4),4326), 'synthetic', false, 'public-submission')`,
    [brandId, submission.cityId, centroid.lng, centroid.lat]
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

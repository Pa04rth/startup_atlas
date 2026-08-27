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
  createdAt: string;
};

export async function getSubmissions(status = "pending"): Promise<SubmissionRow[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, city_id, name, website, tagline, stage, hiring, jobs_url, email, raw, status, created_at
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
    createdAt: r.created_at,
  }));
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
}): Promise<{ id: number }> {
  const pool = getPool();
  const { rows } = await pool.query(
    `insert into submissions (city_id, name, website, tagline, stage, hiring, jobs_url, email, raw)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
    ]
  );
  return { id: rows[0].id };
}

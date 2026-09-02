import type { LocPrecision, ReviewStatus } from "@startup-atlas/core";
import { getPool } from "../index";

// Every read here assumes one office per brand — true today because
// steps/upsert.ts deletes and reinserts a brand's offices on each pipeline
// run. If a brand ever gets multiple offices, switch the LEFT JOIN below to
// pick the highest-precision row instead of relying on "at most one".

export type BrandListItem = {
  id: string;
  slug: string;
  name: string;
  kind: "startup" | "vc" | "mnc";
  tagline: string | null;
  sector: string | null;
  stage: string | null;
  tags: string[];
  hiring: boolean;
  logoUrl: string | null;
  status: ReviewStatus;
  area: string | null;
  lat: number | null;
  lng: number | null;
  precision: LocPrecision | null;
  openJobsCount: number;
  hiringTracks: string[];
  hiringSeniorities: string[];
};

const LIST_ROW_TO_ITEM = (r: Record<string, unknown>): BrandListItem => ({
  id: r.id as string,
  slug: r.slug as string,
  name: r.name as string,
  kind: r.kind as "startup" | "vc" | "mnc",
  tagline: r.tagline as string | null,
  sector: r.sector as string | null,
  stage: r.stage as string | null,
  tags: (r.tags as string[] | null) ?? [],
  hiring: r.hiring as boolean,
  logoUrl: r.logo_url as string | null,
  status: r.status as ReviewStatus,
  area: r.area as string | null,
  lat: r.lat as number | null,
  lng: r.lng as number | null,
  precision: r.precision as LocPrecision | null,
  openJobsCount: Number(r.open_jobs_count ?? 0),
  hiringTracks: (r.hiring_tracks as string[] | null) ?? [],
  hiringSeniorities: (r.hiring_seniorities as string[] | null) ?? [],
});

// Public read — never expose 'review'/'archived' rows outside the admin app.
export async function getPublishedBrands(cityId: string): Promise<BrandListItem[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select b.id, b.slug, b.name, b.kind, b.tagline, b.sector, b.stage, b.tags, b.hiring, b.logo_url,
            b.status, o.area,
            ST_Y(o.geom) as lat, ST_X(o.geom) as lng, o.precision,
            (select count(*) from job_postings jp
              where jp.brand_id = b.id and (jp.expires_at is null or jp.expires_at > now())
            ) as open_jobs_count,
            (select coalesce(array_agg(distinct jp.track) filter (where jp.track is not null), '{}')
              from job_postings jp
              where jp.brand_id = b.id and (jp.expires_at is null or jp.expires_at > now())
            ) as hiring_tracks,
            (select coalesce(array_agg(distinct jp.seniority) filter (where jp.seniority is not null), '{}')
              from job_postings jp
              where jp.brand_id = b.id and (jp.expires_at is null or jp.expires_at > now())
            ) as hiring_seniorities
     from brands b
     left join offices o on o.brand_id = b.id
     where b.city_id = $1 and b.status in ('published','probable')
     order by b.score desc, b.name asc`,
    [cityId]
  );
  return rows.map(LIST_ROW_TO_ITEM);
}

export type BrandProfile = BrandListItem & {
  description: string | null;
  website: string | null;
  domain: string | null;
  foundedYear: number | null;
  lifecycle: string;
  lastVerifiedAt: string | null;
  address: string | null;
};

export async function getBrandBySlug(cityId: string, slug: string): Promise<BrandProfile | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select b.id, b.slug, b.name, b.kind, b.tagline, b.description, b.sector, b.stage, b.tags, b.hiring,
            b.logo_url, b.status, b.website, b.domain, b.founded_year, b.lifecycle,
            b.last_verified_at, o.area, o.address,
            ST_Y(o.geom) as lat, ST_X(o.geom) as lng, o.precision,
            (select count(*) from job_postings jp
              where jp.brand_id = b.id and (jp.expires_at is null or jp.expires_at > now())
            ) as open_jobs_count
     from brands b
     left join offices o on o.brand_id = b.id
     where b.city_id = $1 and b.slug = $2 and b.status in ('published','probable')
     limit 1`,
    [cityId, slug]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    ...LIST_ROW_TO_ITEM(r),
    description: r.description,
    website: r.website,
    domain: r.domain,
    foundedYear: r.founded_year,
    lifecycle: r.lifecycle,
    lastVerifiedAt: r.last_verified_at,
    address: r.address,
  };
}

// Every route in apps/web/app/sitemap.ts needs exactly this — published only.
export async function getAllPublishedSlugs(): Promise<Array<{ cityId: string; slug: string }>> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select city_id, slug from brands where status = 'published' order by city_id, slug`
  );
  return rows.map((r) => ({ cityId: r.city_id as string, slug: r.slug as string }));
}

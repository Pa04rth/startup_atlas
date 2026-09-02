import { getPool } from "../index";

export type JobPosting = {
  id: number;
  brandId: string;
  brandName: string;
  brandSlug: string;
  title: string | null;
  track: string | null;
  seniority: string | null;
  fresherFriendly: boolean;
  applyUrl: string | null;
  isWalkin: boolean;
  walkinAt: string | null;
  venue: string | null;
  expiresAt: string | null;
};

export type BrandJobPosting = {
  id: number;
  title: string | null;
  track: string | null;
  seniority: string | null;
  fresherFriendly: boolean;
  applyUrl: string | null;
  isWalkin: boolean;
  walkinAt: string | null;
  venue: string | null;
  sourceUrl: string | null;
  postedAt: string | null;
};

// For a single company's profile page — includes source_url/posted_at
// (getOpenJobs's city-wide feed doesn't need either) so the page can show
// exactly where a listing came from and let a real "refreshed on X" claim
// stay honest rather than implied.
export async function getJobsForBrand(brandId: string): Promise<BrandJobPosting[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, title, track, seniority, fresher_friendly, apply_url,
            is_walkin, walkin_at, venue, source_url, posted_at
     from job_postings
     where brand_id = $1 and (expires_at is null or expires_at > now())
     order by is_walkin desc, posted_at desc nulls last`,
    [brandId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    track: r.track,
    seniority: r.seniority,
    fresherFriendly: r.fresher_friendly,
    applyUrl: r.apply_url,
    isWalkin: r.is_walkin,
    walkinAt: r.walkin_at,
    venue: r.venue,
    sourceUrl: r.source_url,
    postedAt: r.posted_at,
  }));
}

export type JobDetail = JobPosting & {
  brandLogoUrl: string | null;
  brandTagline: string | null;
  cityId: string;
  sourceUrl: string | null;
  postedAt: string | null;
};

// The internal job detail page (apps/web/app/[city]/jobs/[id]/page.tsx) —
// clicking a job card lands here first, "Apply" is the one link that
// actually leaves the site. Doesn't gate on expires_at the way the list
// views do: a direct link to an aged-out posting should still render (with
// its own honest state), not 404.
export async function getJobById(id: number): Promise<JobDetail | null> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select j.id, j.brand_id, b.name as brand_name, b.slug as brand_slug, b.logo_url as brand_logo_url,
            b.tagline as brand_tagline, j.city_id,
            j.title, j.track, j.seniority, j.fresher_friendly, j.apply_url,
            j.is_walkin, j.walkin_at, j.venue, j.expires_at, j.source_url, j.posted_at
     from job_postings j
     join brands b on b.id = j.brand_id
     where j.id = $1 and b.status in ('published','probable')`,
    [id]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: r.id,
    brandId: r.brand_id,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
    brandLogoUrl: r.brand_logo_url,
    brandTagline: r.brand_tagline,
    cityId: r.city_id,
    title: r.title,
    track: r.track,
    seniority: r.seniority,
    fresherFriendly: r.fresher_friendly,
    applyUrl: r.apply_url,
    isWalkin: r.is_walkin,
    walkinAt: r.walkin_at,
    venue: r.venue,
    expiresAt: r.expires_at,
    sourceUrl: r.source_url,
    postedAt: r.posted_at,
  };
}

// Walk-ins first — that's the feature that beats the incumbent's job stubs.
export async function getOpenJobs(cityId: string): Promise<JobPosting[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select j.id, j.brand_id, b.name as brand_name, b.slug as brand_slug,
            j.title, j.track, j.seniority, j.fresher_friendly, j.apply_url,
            j.is_walkin, j.walkin_at, j.venue, j.expires_at
     from job_postings j
     join brands b on b.id = j.brand_id
     where j.city_id = $1
       and (j.expires_at is null or j.expires_at > now())
       and b.status in ('published','probable')
     order by j.is_walkin desc, j.posted_at desc nulls last`,
    [cityId]
  );
  return rows.map((r) => ({
    id: r.id,
    brandId: r.brand_id,
    brandName: r.brand_name,
    brandSlug: r.brand_slug,
    title: r.title,
    track: r.track,
    seniority: r.seniority,
    fresherFriendly: r.fresher_friendly,
    applyUrl: r.apply_url,
    isWalkin: r.is_walkin,
    walkinAt: r.walkin_at,
    venue: r.venue,
    expiresAt: r.expires_at,
  }));
}

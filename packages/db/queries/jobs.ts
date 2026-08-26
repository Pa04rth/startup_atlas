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

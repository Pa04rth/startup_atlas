// Maintenance-phase step (CLAUDE.md §12/§7: "jobs = refresh_jobs re-visits
// careers pages, upserts new, expires unseen"), same shape as
// refresh_news.ts. Re-checks every published/probable brand's own website
// for a known ATS board (lib/ats.ts) and keeps job_postings in sync: upsert
// whatever's currently listed, expire whatever this brand no longer lists
// (role filled/closed) — never delete, an expired posting just stops
// showing as open (job_postings_city_idx already filters on expires_at).
import { getPool } from "@startup-atlas/db";
import { withRetry } from "../lib/retry";
import { discoverAtsJobs } from "../lib/ats";
import { extractWalkinDetails, isWalkinTitle } from "../lib/walkin";

const REQUEST_DELAY_MS = 400; // politeness spacing — a different host per brand, lighter than Nominatim's 1/sec
const POSTING_TTL = "30 days"; // re-confirmed every run this brand still lists it; otherwise ages out on its own

export async function refreshJobs(cityId: string): Promise<{ brandsChecked: number; found: number; upserted: number }> {
  const pool = getPool();
  const { rows: brands } = await pool.query<{ id: string; website: string }>(
    `select id, website from brands
     where city_id = $1 and status in ('published','probable') and website is not null`,
    [cityId]
  );

  let found = 0;
  let upserted = 0;
  const seenApplyUrls: string[] = [];

  for (const brand of brands) {
    const jobs = await discoverAtsJobs(brand.website);
    if (jobs) {
      found += jobs.length;
      for (const job of jobs) {
        seenApplyUrls.push(job.applyUrl);
        // Venue/date only get extracted for a title that already reads as
        // a walk-in, and only when the ATS's own listing call already
        // included the job body (Greenhouse/Lever/Ashby/Recruitee/Keka/
        // Workable — see lib/ats.ts); SmartRecruiters and any board with no
        // matching title just get is_walkin alone. Both venue and walkinAt
        // stay null unless the description explicitly labels them
        // ("Venue:"/"Date:") — see lib/walkin.ts for why that's on purpose.
        const isWalkin = isWalkinTitle(job.title);
        const { venue, walkinAt } = isWalkin ? extractWalkinDetails(job.description) : { venue: null, walkinAt: null };
        await withRetry(() =>
          pool.query(
            `insert into job_postings
               (brand_id, city_id, title, track, seniority, fresher_friendly, apply_url, source_url, posted_at, is_walkin, venue, walkin_at, expires_at)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now() + interval '${POSTING_TTL}')
             on conflict (apply_url) do update set
               title = excluded.title, track = excluded.track, seniority = excluded.seniority,
               fresher_friendly = excluded.fresher_friendly, posted_at = excluded.posted_at,
               is_walkin = excluded.is_walkin, venue = excluded.venue, walkin_at = excluded.walkin_at,
               expires_at = now() + interval '${POSTING_TTL}'`,
            [
              brand.id,
              cityId,
              job.title,
              job.track,
              job.seniority,
              job.fresherFriendly,
              job.applyUrl,
              job.sourceUrl,
              job.postedAt,
              isWalkin,
              venue,
              walkinAt,
            ]
          )
        );
        upserted++;
      }
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  // Anything previously stored for a brand checked this run but not seen
  // again gets expired — including every prior posting for a brand whose
  // board now returns zero (or couldn't be found at all this time).
  if (brands.length > 0) {
    await pool.query(
      `update job_postings set expires_at = now()
       where city_id = $1
         and brand_id = any($2::uuid[])
         and is_walkin = false
         and not (apply_url = any($3::text[]))
         and (expires_at is null or expires_at > now())`,
      [cityId, brands.map((b) => b.id), seenApplyUrls]
    );
  }

  return { brandsChecked: brands.length, found, upserted };
}

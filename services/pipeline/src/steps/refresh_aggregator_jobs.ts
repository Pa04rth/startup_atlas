// Pulls city job listings from the aggregator APIs (lib/job_aggregators.ts)
// and keeps only the ones that match a company already on the map.
//
// Why match-or-drop: every public jobs query inner-joins brands and filters
// on published/probable status (packages/db/queries/jobs.ts), so a posting
// with a null brand_id is a row nothing can ever render. Storing them would
// just be silent landfill. Dropping them also keeps the product's premise
// honest — a job on this map belongs to a company on this map.
//
// Matching is deliberately strict (exact normalized-name equality, and only
// when that name is unambiguous within the city). A fuzzy match here would
// attach a stranger's job posting to someone else's company profile, which
// is a worse failure than showing no job at all.
import { getPool } from "@startup-atlas/db";
import { withRetry } from "../lib/retry";
import { fetchAdzunaJobs, fetchJoobleJobs, type AggregatorJob } from "../lib/job_aggregators";
import { extractWalkinDetails, isWalkinTitle } from "../lib/walkin";

const POSTING_TTL = "30 days";

// Strips the noise that makes the same company look like two ("Acme
// Technologies Pvt. Ltd." vs "Acme Technologies") without collapsing
// genuinely different names into each other.
const LEGAL_SUFFIXES =
  /\b(?:pvt|private|ltd|limited|llp|inc|incorporated|corp|corporation|co|company|technologies|technology|labs|solutions|services|india)\b/g;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(LEGAL_SUFFIXES, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function refreshAggregatorJobs(
  cityId: string,
  cityName: string
): Promise<{
  fetched: number;
  matched: number;
  upserted: number;
  unmatchedSample: string[];
  sources: Record<string, number>;
}> {
  const pool = getPool();

  const [adzuna, jooble] = await Promise.all([
    fetchAdzunaJobs(cityName).catch(() => []),
    fetchJoobleJobs(cityName).catch(() => []),
  ]);
  const sources = { adzuna: adzuna.length, jooble: jooble.length };
  const listings = [...adzuna, ...jooble];
  if (listings.length === 0) {
    return { fetched: 0, matched: 0, upserted: 0, unmatchedSample: [], sources };
  }

  // Build the lookup once. A normalized name that maps to more than one
  // brand in this city is dropped from the index entirely — ambiguous is
  // treated as no match, never as a coin flip.
  const { rows: brands } = await pool.query<{ id: string; name: string }>(
    `select id, name from brands
     where city_id = $1 and status in ('published','probable')`,
    [cityId]
  );
  const byName = new Map<string, string | null>();
  for (const b of brands) {
    const key = normalizeCompanyName(b.name);
    if (!key) continue;
    byName.set(key, byName.has(key) ? null : b.id);
  }

  const matched: Array<{ brandId: string; job: AggregatorJob }> = [];
  const unmatched = new Set<string>();
  for (const job of listings) {
    const brandId = byName.get(normalizeCompanyName(job.company)) ?? null;
    if (brandId) matched.push({ brandId, job });
    else unmatched.add(job.company);
  }

  let upserted = 0;
  for (const { brandId, job } of matched) {
    const isWalkin = isWalkinTitle(job.title);
    const { venue, walkinAt } = isWalkin
      ? extractWalkinDetails(job.description)
      : { venue: null, walkinAt: null };

    await withRetry(() =>
      pool.query(
        `insert into job_postings
           (brand_id, city_id, title, track, seniority, fresher_friendly, apply_url, source_url,
            posted_at, is_walkin, venue, walkin_at, expires_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now() + interval '${POSTING_TTL}')
         on conflict (apply_url) do update set
           title = excluded.title, track = excluded.track, seniority = excluded.seniority,
           fresher_friendly = excluded.fresher_friendly, posted_at = excluded.posted_at,
           is_walkin = excluded.is_walkin, venue = excluded.venue, walkin_at = excluded.walkin_at,
           expires_at = now() + interval '${POSTING_TTL}'`,
        [
          brandId,
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

  // Deliberately no expiry sweep here, unlike refresh_jobs.ts. That step
  // owns a brand's ATS board and can say "this board no longer lists it";
  // an aggregator query is a keyword/location slice we can't treat as an
  // authoritative full list, so postings just age out via their own TTL.
  return {
    fetched: listings.length,
    matched: matched.length,
    upserted,
    unmatchedSample: [...unmatched].slice(0, 15),
    sources,
  };
}

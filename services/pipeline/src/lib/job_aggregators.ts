// Job-aggregator APIs — Adzuna and Jooble. Both are official, documented,
// self-serve APIs with a free tier and real India coverage, so unlike
// scraping LinkedIn/Indeed/Naukri (their terms prohibit it, and the data
// isn't ours to take) this is a source we can actually build on.
//
// Why this exists at all: measured against 40 random published Pune brands,
// only 2 run any machine-readable ATS board — including the eight platforms
// lib/ats.ts doesn't support. So the ATS path, however many integrations it
// grows, structurally cannot cover most of this dataset. Aggregators index
// the job boards those companies actually post on.
//
// Both are env-gated: with no key configured the collector is simply
// skipped, never a hard failure (see steps/refresh_aggregator_jobs.ts).
import type { JobItem } from "../types";
import { inferSeniority, inferTrack } from "./job_classify";

const FETCH_TIMEOUT_MS = 15000;
const USER_AGENT = "startup-atlas/0.1 (+https://github.com/Pa04rth)";

// One aggregator listing before it's matched to a brand. `company` is the
// employer name as the aggregator reports it — matching that back to a
// brands row is the caller's job (steps/refresh_aggregator_jobs.ts), and
// anything unmatched is dropped rather than stored, because every public
// jobs query inner-joins brands and a brand-less posting would be a row
// nothing can ever display.
export type AggregatorJob = JobItem & { company: string };

function toJob(input: {
  title: string;
  company: string;
  applyUrl: string;
  sourceUrl: string;
  postedAt: string | null;
  description?: string | null;
}): AggregatorJob {
  const { seniority, fresherFriendly } = inferSeniority(input.title);
  return {
    title: input.title.trim(),
    track: inferTrack(input.title),
    seniority,
    fresherFriendly,
    applyUrl: input.applyUrl,
    sourceUrl: input.sourceUrl,
    postedAt: input.postedAt,
    description: input.description ?? null,
    company: input.company.trim(),
  };
}

// --- Adzuna -----------------------------------------------------------
// GET api.adzuna.com/v1/api/jobs/in/search/{page}
//   ?app_id=&app_key=&where=Pune&results_per_page=50
// -> { count, results: [{ id, title, company: { display_name },
//      location: { display_name, area[] }, created, redirect_url,
//      description }] }
// "in" is Adzuna's India country code.
type AdzunaResult = {
  title?: string;
  company?: { display_name?: string };
  created?: string;
  redirect_url?: string;
  description?: string;
};
type AdzunaResponse = { results?: AdzunaResult[] };

const ADZUNA_PAGE_SIZE = 50;

export async function fetchAdzunaJobs(cityName: string, maxPages = 5): Promise<AggregatorJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];

  const jobs: AggregatorJob[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const url =
      `https://api.adzuna.com/v1/api/jobs/in/search/${page}` +
      `?app_id=${encodeURIComponent(appId)}&app_key=${encodeURIComponent(appKey)}` +
      `&where=${encodeURIComponent(cityName)}&results_per_page=${ADZUNA_PAGE_SIZE}` +
      `&content-type=application/json`;

    let data: AdzunaResponse | null = null;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) break; // 401 (bad key) / 429 (quota) — stop, don't hammer a free tier
      data = (await res.json()) as AdzunaResponse;
    } catch {
      break;
    }

    const results = data?.results ?? [];
    if (results.length === 0) break;

    for (const r of results) {
      const company = r.company?.display_name;
      if (!r.title || !company || !r.redirect_url) continue;
      jobs.push(
        toJob({
          title: r.title,
          company,
          applyUrl: r.redirect_url,
          sourceUrl: "https://www.adzuna.in/",
          postedAt: r.created ?? null,
          description: r.description ?? null,
        })
      );
    }
    if (results.length < ADZUNA_PAGE_SIZE) break;
  }
  return jobs;
}

// --- Jooble -----------------------------------------------------------
// POST jooble.org/api/{key}  body: { keywords, location, page }
// -> { totalCount, jobs: [{ id, title, location, snippet, salary, source,
//      type, link, company, updated }] }
type JoobleJob = {
  title?: string;
  company?: string;
  link?: string;
  updated?: string;
  snippet?: string;
};
type JoobleResponse = { jobs?: JoobleJob[] };

export async function fetchJoobleJobs(cityName: string, maxPages = 5): Promise<AggregatorJob[]> {
  const key = process.env.JOOBLE_API_KEY;
  if (!key) return [];

  const jobs: AggregatorJob[] = [];
  for (let page = 1; page <= maxPages; page++) {
    let data: JoobleResponse | null = null;
    try {
      const res = await fetch(`https://jooble.org/api/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": USER_AGENT },
        // No `keywords`: we want everything in the city, not a keyword slice
        // — the brand-name match downstream is what narrows it.
        body: JSON.stringify({ location: cityName, page: String(page) }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) break;
      data = (await res.json()) as JoobleResponse;
    } catch {
      break;
    }

    const results = data?.jobs ?? [];
    if (results.length === 0) break;

    for (const j of results) {
      if (!j.title || !j.company || !j.link) continue;
      jobs.push(
        toJob({
          title: j.title,
          company: j.company,
          applyUrl: j.link,
          sourceUrl: "https://jooble.org/",
          postedAt: j.updated ?? null,
          description: j.snippet ?? null,
        })
      );
    }
  }
  return jobs;
}

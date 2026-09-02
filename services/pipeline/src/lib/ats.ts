// Finds and pulls real, live job listings straight from a company's own
// applicant-tracking system — Greenhouse and Lever both publish a genuinely
// free, public, unauthenticated JSON API meant for exactly this kind of
// embedding, so there's no scraping fragility once the board is found (see
// steps/refresh_jobs.ts's daily refresh).
//
// The one real limitation, worth being honest about: this only finds
// companies whose careers page links directly to boards.greenhouse.io/{x}
// or jobs.lever.co/{x}. A large company that's paid for a white-labeled,
// custom-domain ATS (careers.company.com with no visible greenhouse.io/
// lever.co URL anywhere) won't be discoverable this way — verified against
// airbnb.com/careers, which is exactly this case. That's fine here: most
// of what this product covers is smaller, funded startups that use the
// default unbranded board, and for the rest this just correctly finds
// nothing rather than guessing at a URL.
import { setMaxListeners } from "node:events";
import type { JobItem } from "../types";
import { inferSeniority, inferTrack } from "./job_classify";

// Two concurrent fetches per brand (see CAREERS_PATHS below), each with its
// own AbortSignal.timeout(), across hundreds of brands with only a short
// delay between them (see refresh_jobs.ts) — harmless, but past Node's
// default of 10 it prints a MaxListenersExceededWarning on every cron run
// that looks like a real leak. It isn't one; just raise the ceiling.
setMaxListeners(50);

const CAREERS_PATHS = ["", "/careers"];
const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = "Mozilla/5.0 (compatible; startup-atlas/0.1)";

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function findGreenhouseSlug(html: string): string | null {
  const m =
    html.match(/(?:boards|job-boards)\.greenhouse\.io\/([a-z0-9-]+)/i) ??
    html.match(/greenhouse\.io\/embed\/job_board\?for=([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function findLeverSlug(html: string): string | null {
  const m = html.match(/jobs\.lever\.co\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function findAshbySlug(html: string): string | null {
  const m = html.match(/jobs\.ashbyhq\.com\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

type GreenhouseJob = { title?: string; absolute_url?: string; updated_at?: string };
type GreenhouseBoard = { jobs?: GreenhouseJob[] };

async function fetchGreenhouse(slug: string): Promise<JobItem[] | null> {
  const data = await fetchJson<GreenhouseBoard>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
  if (!data?.jobs) return null;
  return data.jobs
    .filter((j): j is Required<Pick<GreenhouseJob, "title" | "absolute_url">> & GreenhouseJob => !!j.title && !!j.absolute_url)
    .map((j) => {
      const { seniority, fresherFriendly } = inferSeniority(j.title);
      return {
        title: j.title.trim(),
        track: inferTrack(j.title),
        seniority,
        fresherFriendly,
        applyUrl: j.absolute_url,
        sourceUrl: `https://boards.greenhouse.io/${slug}`,
        postedAt: j.updated_at ?? null,
      };
    });
}

// Lever's documented public postings schema (api.lever.co/v0/postings/{site}).
type LeverPosting = { text?: string; hostedUrl?: string; createdAt?: number };

async function fetchLever(slug: string): Promise<JobItem[] | null> {
  const data = await fetchJson<LeverPosting[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
  if (!Array.isArray(data)) return null;
  return data
    .filter((j): j is Required<Pick<LeverPosting, "text" | "hostedUrl">> & LeverPosting => !!j.text && !!j.hostedUrl)
    .map((j) => {
      const { seniority, fresherFriendly } = inferSeniority(j.text);
      return {
        title: j.text.trim(),
        track: inferTrack(j.text),
        seniority,
        fresherFriendly,
        applyUrl: j.hostedUrl,
        sourceUrl: `https://jobs.lever.co/${slug}`,
        postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      };
    });
}

// Ashby's public, unauthenticated Job Board API — same "meant for
// embedding, no scraping fragility" case as Greenhouse/Lever. Verified live
// against api.ashbyhq.com/posting-api/job-board/ashby: { jobs: [{ title,
// jobUrl, applyUrl, publishedAt, isListed, ... }] }. Only isListed jobs are
// actually open — Ashby returns closed-but-recent postings too.
type AshbyJob = { title?: string; applyUrl?: string; jobUrl?: string; publishedAt?: string; isListed?: boolean };
type AshbyBoard = { jobs?: AshbyJob[] };

async function fetchAshby(slug: string): Promise<JobItem[] | null> {
  const data = await fetchJson<AshbyBoard>(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
  if (!data?.jobs) return null;
  return data.jobs
    .filter((j): j is Required<Pick<AshbyJob, "title">> & AshbyJob => !!j.title && j.isListed !== false)
    .map((j) => {
      const { seniority, fresherFriendly } = inferSeniority(j.title);
      return {
        title: j.title.trim(),
        track: inferTrack(j.title),
        seniority,
        fresherFriendly,
        applyUrl: j.applyUrl ?? j.jobUrl ?? `https://jobs.ashbyhq.com/${slug}`,
        sourceUrl: `https://jobs.ashbyhq.com/${slug}`,
        postedAt: j.publishedAt ?? null,
      };
    });
}

// Returns null when no known ATS is detected — an honest "nothing found",
// not an error, and never a reason to fall back to guessing.
export async function discoverAtsJobs(website: string): Promise<JobItem[] | null> {
  let base: string;
  try {
    base = new URL(website).origin;
  } catch {
    return null;
  }

  const pages = await Promise.all(CAREERS_PATHS.map((p) => fetchText(base + p)));
  const html = pages.filter((p): p is string => !!p).join("\n");
  if (!html) return null;

  const greenhouseSlug = findGreenhouseSlug(html);
  if (greenhouseSlug) return fetchGreenhouse(greenhouseSlug);

  const leverSlug = findLeverSlug(html);
  if (leverSlug) return fetchLever(leverSlug);

  const ashbySlug = findAshbySlug(html);
  if (ashbySlug) return fetchAshby(ashbySlug);

  return null;
}

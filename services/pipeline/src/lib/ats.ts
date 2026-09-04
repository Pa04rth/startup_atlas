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
// 15s, up from 6s. Measured against 40 random published Pune brands: 6s
// reached 28 of them, 15-20s reaches 31 — a lot of small-company sites in
// this dataset are on slow shared hosting and simply need longer than six
// seconds to answer.
const FETCH_TIMEOUT_MS = 15000;
// A real browser UA, not "compatible; startup-atlas/0.1". Some hosts reject
// or challenge unrecognized agents outright, and we are only ever reading
// the same public careers page a visitor would — nothing here depends on
// being unidentifiable, it just has to not be pre-emptively refused.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      // Careers pages are very often a redirect (http->https, apex->www, or
      // straight to a hosted board); without this those all read as misses.
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
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

function findWorkableSlug(html: string): string | null {
  const m = html.match(/apply\.workable\.com\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function findRecruiteeSlug(html: string): string | null {
  const m = html.match(/([a-z0-9-]+)\.recruitee\.com/i);
  return m ? m[1].toLowerCase() : null;
}

// Full URL, not just a slug — Keka's job-list endpoint also needs the
// portal identifier embedded in the careers page itself (see fetchKeka).
function findKekaCareersUrl(html: string): string | null {
  const m = html.match(/https?:\/\/([a-z0-9-]+\.keka\.com\/careers(?:\/[a-z0-9_-]+)?)/i);
  return m ? `https://${m[1]}` : null;
}

function findSmartRecruitersSlug(html: string): string | null {
  const m = html.match(/(?:jobs\.smartrecruiters\.com\/|api\.smartrecruiters\.com\/v1\/companies\/)([a-zA-Z0-9.]+)/i);
  return m ? m[1] : null;
}

type GreenhouseJob = { title?: string; absolute_url?: string; updated_at?: string; content?: string };
type GreenhouseBoard = { jobs?: GreenhouseJob[] };

async function fetchGreenhouse(slug: string): Promise<JobItem[] | null> {
  // content=true (was false) — the only way to get each posting's body for
  // walk-in venue/date extraction (lib/walkin.ts); Greenhouse boards here
  // are small enough that the extra payload is a non-issue.
  const data = await fetchJson<GreenhouseBoard>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
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
        description: j.content ?? null,
      };
    });
}

// Lever's documented public postings schema (api.lever.co/v0/postings/{site}).
// descriptionPlain/description ride along in the same list response already
// — no extra request needed for walk-in venue/date extraction.
type LeverPosting = { text?: string; hostedUrl?: string; createdAt?: number; descriptionPlain?: string; description?: string };

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
        description: j.descriptionPlain ?? j.description ?? null,
      };
    });
}

// Ashby's public, unauthenticated Job Board API — same "meant for
// embedding, no scraping fragility" case as Greenhouse/Lever. Verified live
// against api.ashbyhq.com/posting-api/job-board/ashby: { jobs: [{ title,
// jobUrl, applyUrl, publishedAt, isListed, ... }] }. Only isListed jobs are
// actually open — Ashby returns closed-but-recent postings too.
type AshbyJob = {
  title?: string;
  applyUrl?: string;
  jobUrl?: string;
  publishedAt?: string;
  isListed?: boolean;
  descriptionHtml?: string;
};
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
        description: j.descriptionHtml ?? null,
      };
    });
}

// Workable's public embed-widget API — same "meant for embedding, no
// scraping fragility" case as Greenhouse/Lever/Ashby. Verified against the
// widget's documented shape: apply.workable.com/api/v1/widget/accounts/{x}
// -> { jobs: [{ title, url, shortlink, published_on, created_at, state }] }.
type WorkableJob = {
  title?: string;
  url?: string;
  shortlink?: string;
  published_on?: string;
  created_at?: string;
  state?: string;
  full_description?: string;
  description?: string;
};
type WorkableBoard = { jobs?: WorkableJob[] };

async function fetchWorkable(slug: string): Promise<JobItem[] | null> {
  // details=true is what makes full_description/description available.
  const data = await fetchJson<WorkableBoard>(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`);
  if (!data?.jobs) return null;
  return data.jobs
    .filter((j) => j.state === undefined || j.state === "published")
    .filter((j): j is Required<Pick<WorkableJob, "title">> & WorkableJob => !!j.title && !!(j.url ?? j.shortlink))
    .map((j) => {
      const { seniority, fresherFriendly } = inferSeniority(j.title);
      return {
        title: j.title.trim(),
        track: inferTrack(j.title),
        seniority,
        fresherFriendly,
        applyUrl: (j.url ?? j.shortlink) as string,
        sourceUrl: `https://apply.workable.com/${slug}/`,
        postedAt: j.published_on ?? j.created_at ?? null,
        description: j.full_description ?? j.description ?? null,
      };
    });
}

// Recruitee's public careers-site API — every Recruitee-hosted board
// exposes its published offers this way, no token needed. Verified shape:
// {slug}.recruitee.com/api/offers/ -> { offers: [{ title, careers_url,
// status, published_at, created_at }] }.
type RecruiteeOffer = {
  title?: string;
  careers_url?: string;
  status?: string;
  published_at?: string;
  created_at?: string;
  description?: string;
};
type RecruiteeBoard = { offers?: RecruiteeOffer[] };

async function fetchRecruitee(slug: string): Promise<JobItem[] | null> {
  const data = await fetchJson<RecruiteeBoard>(`https://${slug}.recruitee.com/api/offers/`);
  if (!data?.offers) return null;
  return data.offers
    .filter((o) => o.status === "published")
    .filter((o): o is Required<Pick<RecruiteeOffer, "title" | "careers_url">> & RecruiteeOffer => !!o.title && !!o.careers_url)
    .map((o) => {
      const { seniority, fresherFriendly } = inferSeniority(o.title);
      return {
        title: o.title.trim(),
        track: inferTrack(o.title),
        seniority,
        fresherFriendly,
        applyUrl: o.careers_url,
        sourceUrl: `https://${slug}.recruitee.com/`,
        postedAt: o.published_at ?? o.created_at ?? null,
        description: o.description ?? null,
      };
    });
}

// Keka — very common among Indian startups/SMEs. Genuinely public,
// credential-free, but a two-step fetch (unlike the single-slug APIs
// above): the portal page itself embeds a "career portal identifier" GUID
// that the jobs endpoint requires. Verified shape against the ats-scrapers
// open-source project (kalil0321/ats-scrapers, MIT): {origin}/careers/api/
// embedjobs/{portal}/active/{identifier} -> a bare JSON array of jobs.
type KekaJob = { id?: number; title?: string; publishedOn?: string; description?: string };

async function fetchKeka(careersUrl: string): Promise<JobItem[] | null> {
  const html = await fetchText(careersUrl);
  if (!html) return null;

  const idMatch = html.match(/(?:ats\/documents|careers\/api\/embedjobs\/js)\/([0-9a-f-]{36})/i);
  if (!idMatch) return null;
  const identifier = idMatch[1].toLowerCase();

  const url = new URL(careersUrl);
  const segments = url.pathname.split("/").filter(Boolean); // ["careers", "<portal>"?]
  const portal = segments[1] ?? "default";

  const data = await fetchJson<KekaJob[]>(`${url.origin}/careers/api/embedjobs/${portal}/active/${identifier}`);
  if (!Array.isArray(data)) return null;

  return data
    .filter((j): j is Required<Pick<KekaJob, "id" | "title">> & KekaJob => j.id != null && !!j.title)
    .map((j) => {
      const { seniority, fresherFriendly } = inferSeniority(j.title);
      return {
        title: j.title.trim(),
        track: inferTrack(j.title),
        seniority,
        fresherFriendly,
        applyUrl: `${careersUrl}/jobdetails/${j.id}`,
        sourceUrl: careersUrl,
        postedAt: j.publishedOn ?? null,
        description: j.description ?? null,
      };
    });
}

// SmartRecruiters' public postings API — no auth, straightforward REST,
// same trust tier as Greenhouse/Lever. Verified shape:
// api.smartrecruiters.com/v1/companies/{slug}/postings -> { content: [{ id, name, releasedDate }] }.
// The listing omits the description body (a separate per-job detail call
// would be needed) — not fetched here, so walk-in venue/date extraction
// (lib/walkin.ts) never applies to SmartRecruiters postings today.
type SmartRecruitersPosting = { id?: string; name?: string; releasedDate?: string };
type SmartRecruitersBoard = { content?: SmartRecruitersPosting[] };

async function fetchSmartRecruiters(slug: string): Promise<JobItem[] | null> {
  const data = await fetchJson<SmartRecruitersBoard>(
    `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`
  );
  if (!data?.content) return null;

  return data.content
    .filter((p): p is Required<Pick<SmartRecruitersPosting, "id" | "name">> & SmartRecruitersPosting => !!p.id && !!p.name)
    .map((p) => {
      const { seniority, fresherFriendly } = inferSeniority(p.name);
      return {
        title: p.name.trim(),
        track: inferTrack(p.name),
        seniority,
        fresherFriendly,
        applyUrl: `https://jobs.smartrecruiters.com/${slug}/${p.id}`,
        sourceUrl: `https://jobs.smartrecruiters.com/${slug}`,
        postedAt: p.releasedDate ?? null,
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

  const workableSlug = findWorkableSlug(html);
  if (workableSlug) return fetchWorkable(workableSlug);

  const recruiteeSlug = findRecruiteeSlug(html);
  if (recruiteeSlug) return fetchRecruitee(recruiteeSlug);

  const kekaUrl = findKekaCareersUrl(html);
  if (kekaUrl) return fetchKeka(kekaUrl);

  const smartRecruitersSlug = findSmartRecruitersSlug(html);
  if (smartRecruitersSlug) return fetchSmartRecruiters(smartRecruitersSlug);

  return null;
}

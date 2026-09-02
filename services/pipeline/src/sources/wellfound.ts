// Wellfound's location pages look like a client-rendered SPA but are
// actually Next.js SSR with the real data embedded as an Apollo GraphQL
// cache in the page's __NEXT_DATA__ script tag (verified against the live
// page — 196 real Pune startups in that cache, not a JS-only shell). Parsing
// that JSON directly is far more robust than DOM-scraping React's generated
// class names, which change on every deploy.
import type { RawRecord } from "../types";

const SOURCE_NAME = "wellfound";
const PAGE_DELAY_MS = 600; // polite spacing between page fetches
const MAX_PAGES = 25; // safety net if pageCount ever comes back wrong

type StartupResult = {
  __typename?: string;
  name?: string;
  slug?: string;
  companyUrl?: string;
  logoUrl?: string;
  highConcept?: string;
  description?: string;
};

function extractNextData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// The Apollo cache keys its paginated query by the exact args used to fetch
// it (e.g. `seoLandingPageStartupSearchResults({"location":"pune","page":2,...})`).
// Find that key rather than hardcoding it, since key ordering/formatting is
// an implementation detail of Wellfound's Apollo setup, not a stable contract.
function findSearchResultsKey(rootQuery: Record<string, unknown>, page: number): string | null {
  // Lives directly on `talent`, as a sibling of `viewer` — not nested inside
  // it (verified against the live cache; easy to get wrong since `viewer`
  // holds most of the other per-request state).
  const talent = rootQuery?.talent as Record<string, unknown> | undefined;
  if (!talent) return null;
  return (
    Object.keys(talent).find(
      (k) => k.startsWith("seoLandingPageStartupSearchResults(") && k.includes(`"page":${page}`)
    ) ?? null
  );
}

// Parametrized by location slug so the same collector covers every city —
// Wellfound's location pages use the same __NEXT_DATA__/Apollo shape for
// any location slug (verified against .../location/mumbai too), only the
// URL and totalStartupCount differ.
async function collectWellfoundByLocation(location: string): Promise<RawRecord[]> {
  const baseUrl = `https://wellfound.com/startups/location/${location}`;
  const records: RawRecord[] = [];
  let pageCount = 1;

  for (let page = 1; page <= Math.min(pageCount, MAX_PAGES); page++) {
    const url = page === 1 ? baseUrl : `${baseUrl}?page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; startup-atlas/0.1)" },
    });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);

    const html = await res.text();
    const nextData = extractNextData(html);
    const pageProps = (nextData?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;
    const apolloData = (pageProps?.apolloState as Record<string, unknown>)?.data as
      | Record<string, unknown>
      | undefined;
    if (!apolloData) throw new Error(`no Apollo state found on ${url} — page structure may have changed`);

    const rootQuery = apolloData.ROOT_QUERY as Record<string, unknown>;
    const talent = rootQuery?.talent as Record<string, unknown> | undefined;
    const key = findSearchResultsKey(rootQuery, page);
    if (!key || !talent) break; // no more pages

    const results = talent[key] as { totalStartupCount?: number; perPage?: number; startups?: Array<{ __ref: string }> };
    if (page === 1 && results.totalStartupCount && results.perPage) {
      pageCount = Math.ceil(results.totalStartupCount / results.perPage);
    }

    for (const { __ref } of results.startups ?? []) {
      const startup = apolloData[__ref] as StartupResult | undefined;
      if (!startup?.name) continue;

      records.push({
        name: startup.name,
        website: startup.companyUrl || undefined,
        tagline: startup.highConcept || undefined,
        description: startup.description || undefined,
        logoUrl: startup.logoUrl || undefined,
        sourceUrl: url,
        sourceName: SOURCE_NAME,
      });
    }

    if (page < pageCount) await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }

  return records;
}

export function collectWellfoundPune(): Promise<RawRecord[]> {
  return collectWellfoundByLocation("pune");
}

export function collectWellfoundMumbai(): Promise<RawRecord[]> {
  return collectWellfoundByLocation("mumbai");
}

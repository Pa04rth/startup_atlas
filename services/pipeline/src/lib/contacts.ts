// The Phase 7 "company_site.ts" gap — this is what actually populates the
// free HR/careers/leadership contact directory at scale (CLAUDE.md §7/FR-5).
// The incubator/Wellfound discovery sources never touch company_contacts;
// this revisits an *existing* brand's own website, same "maintenance step
// against an already-real brand" shape as lib/ats.ts.
//
// Only ever extracts a public `mailto:` link actually printed on the
// company's own site (plus, honestly, what page it came from as
// source_url) — never guesses an address pattern like careers@{domain}
// that isn't actually on the page. A wrong guess that looks confident is
// worse than finding nothing (same rule REPLIT_AGENT_PROMPT.md states for
// the discovery side of this pipeline).
import type { CompanyContact } from "@startup-atlas/db";

const PAGES_TO_CHECK = ["", "/careers", "/about", "/team", "/contact"];
const FETCH_TIMEOUT_MS = 6000;
const USER_AGENT = "Mozilla/5.0 (compatible; startup-atlas/0.1)";
const MAX_CONTACTS_PER_BRAND = 5;

export type ScrapedContact = {
  type: CompanyContact["type"];
  email: string;
  sourceUrl: string;
};

// Ordered most-specific-first — an address matching "careers"/"jobs" is
// classified as such even though it might also contain "team" as a
// substring of the page it came from; this only looks at the email's own
// local-part, not the page URL.
const TYPE_PATTERNS: Array<{ type: CompanyContact["type"]; pattern: RegExp }> = [
  { type: "careers", pattern: /^(careers?|jobs?|talent|recruit(ing|ment)?|hiring)[.+_-]?/i },
  { type: "hr", pattern: /^(hr|people|humanresources?)[.+_-]?/i },
  { type: "leadership", pattern: /^(ceo|founders?|leadership|cofounders?)[.+_-]?/i },
  { type: "general", pattern: /^(info|contact|hello|support|admin)[.+_-]?/i },
];

function classify(localPart: string): CompanyContact["type"] | null {
  for (const { type, pattern } of TYPE_PATTERNS) {
    if (pattern.test(localPart)) return type;
  }
  return null;
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Deliberately not a generic "any email on the page" scrape — a company's
// marketing copy or a third-party widget can leak unrelated addresses.
// Only mailto: links carry clear enough intent ("this is how you reach
// us") to publish as a sourced fact.
function extractMailtoEmails(html: string): string[] {
  const matches = html.matchAll(/href=["']mailto:([^"'?]+)/gi);
  const emails = new Set<string>();
  for (const m of matches) {
    const email = m[1].trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) emails.add(email);
  }
  return [...emails];
}

export async function scrapeCompanyContacts(website: string): Promise<ScrapedContact[]> {
  let base: string;
  try {
    base = new URL(website).origin;
  } catch {
    return [];
  }

  const found = new Map<string, ScrapedContact>(); // keyed by email — first page it's found on wins

  for (const path of PAGES_TO_CHECK) {
    if (found.size >= MAX_CONTACTS_PER_BRAND) break;
    const url = base + path;
    const html = await fetchText(url);
    if (!html) continue;

    for (const email of extractMailtoEmails(html)) {
      if (found.has(email)) continue;
      const localPart = email.split("@")[0];
      const type = classify(localPart);
      if (!type) continue; // an unrecognized personal-looking address (e.g. priya@) isn't safe to auto-publish
      found.set(email, { type, email, sourceUrl: url });
      if (found.size >= MAX_CONTACTS_PER_BRAND) break;
    }
  }

  return [...found.values()];
}

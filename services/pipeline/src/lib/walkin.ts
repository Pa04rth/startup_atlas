// Detects a walk-in interview drive from a job's own title — the only
// field every ATS integration in lib/ats.ts returns uniformly, so this is
// applied once in refresh_jobs.ts rather than duplicated per-platform.
// Deliberately title-only, not full-description parsing: venue/date text
// buried in a job body is much harder to extract without risking a wrong
// (fabricated-looking) venue or date, which is worse than showing none.
// Word boundary + optional hyphen/space keeps "walk-in"/"walkin"/"walk in"
// matching without also matching "walking".
const WALKIN_RE = /\bwalk[\s-]?ins?\b/i;

export function isWalkinTitle(title: string): boolean {
  return WALKIN_RE.test(title);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Only pulled for postings whose title already matched isWalkinTitle — and
// only when the source text explicitly labels the field ("Venue:", "Date:"
// / "Walk-in Date:"). No label, no value: guessing a venue or date from
// unstructured description text is exactly the kind of fabricated-looking
// fact CLAUDE.md's trust rule exists to prevent, so this stays
// conservative on purpose rather than trying to be clever.
const VENUE_RE = /\bvenue\s*[:\-]\s*([^\n\r]{5,200})/i;
const DATE_RE = /\b(?:walk-?in\s+)?date\s*[:\-]\s*([^\n\r]{4,60})/i;
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

function extractVenue(text: string): string | null {
  const m = text.match(VENUE_RE);
  if (!m) return null;
  return m[1].trim().replace(/\s{2,}/g, " ") || null;
}

function extractWalkinDate(text: string): string | null {
  const m = text.match(DATE_RE);
  if (!m) return null;
  // Ordinal suffixes ("15th September") aren't parseable by Date() as-is.
  const cleaned = m[1].trim().replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) return null;
  // Sanity bound: reject anything not plausibly an upcoming walk-in — a
  // mis-parsed fragment landing decades away is worse than no date at all.
  const now = Date.now();
  if (parsed.getTime() < now - ONE_DAY_MS || parsed.getTime() > now + SIX_MONTHS_MS) return null;
  return parsed.toISOString();
}

export function extractWalkinDetails(descriptionHtml: string | null | undefined): {
  venue: string | null;
  walkinAt: string | null;
} {
  if (!descriptionHtml) return { venue: null, walkinAt: null };
  const text = stripHtml(descriptionHtml);
  return { venue: extractVenue(text), walkinAt: extractWalkinDate(text) };
}

// A harder logo search than lib/logos.ts's plain DuckDuckGo lookup — used by
// verify-bengaluru.ts specifically for brands that came out of the
// bangalorestartupmap.com import with no logo at all (it shipped one for
// only 91 of 1069 companies). Tries several sources in quality order and
// keeps the first real image it finds; never invents one (CLAUDE.md's
// "never fake a fact" rule applies to logos too — a brand with nothing
// found stays on its initials avatar, same as CompanyLogo.tsx already
// handles).
//
// Same fetch-once-and-cache-to-R2 storage as lib/logos.ts (same bucket,
// same `logos/<domain>.<ext>` key shape) — a hit here satisfies that
// function's own R2 existence check on a later run, so the two never
// duplicate work.
import * as cheerio from "cheerio";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!;
const USER_AGENT = "startup-atlas/0.1 (contact: parthsohaney04@gmail.com)";
const FETCH_TIMEOUT_MS = 8000;
// A blank 1x1 placeholder or a broken image response is typically under
// this size; a real (even tiny 16x16 ico) favicon is reliably larger.
const MIN_BYTES = 200;

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("icon")) return "ico";
  return "png";
}

type Candidate = { url: string; rank: number }; // lower rank = tried first

// Reads the company's own homepage for the icon links it declares itself —
// the most likely thing to actually be their logo/mark, as opposed to a
// third party's guess. apple-touch-icon is preferred: browsers require it
// to be a real square icon (usually >=180x180), whereas a plain <link
// rel="icon"> is very often a tiny 16x16 favicon that looks like a dot at
// map-pin size.
async function candidatesFromHomepage(websiteUrl: string): Promise<Candidate[]> {
  const res = await fetch(websiteUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) return [];
  const html = await res.text();
  const $ = cheerio.load(html);
  const base = new URL(res.url);
  const out: Candidate[] = [];

  const push = (href: string | undefined, rank: number) => {
    if (!href) return;
    try {
      out.push({ url: new URL(href, base).toString(), rank });
    } catch {
      // relative URL didn't resolve against a real base — skip it
    }
  };

  $('link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]').each((_, el) =>
    push($(el).attr("href"), 0)
  );
  $('link[rel="icon"][sizes], link[rel="shortcut icon"][sizes]').each((_, el) => push($(el).attr("href"), 1));
  $('link[rel="icon"], link[rel="shortcut icon"]').each((_, el) => push($(el).attr("href"), 2));
  $('meta[property="og:image"]').each((_, el) => push($(el).attr("content"), 3));

  return out;
}

async function tryDownload(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/") && !contentType.includes("icon")) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength < MIN_BYTES) return null;
    return { buffer, contentType: contentType || "image/png" };
  } catch {
    return null;
  }
}

// Third-party lookups, in the order they're worth trying — used only when
// the site's own homepage declared nothing usable. Clearbit answers 404
// cleanly when it has nothing (so tryDownload's !res.ok naturally screens
// it out); Google's favicon service almost always answers something, which
// is exactly why it's ranked last — a generic globe glyph is still better
// than no logo at all, but only once every real source has been tried.
function thirdPartyCandidates(domain: string): Candidate[] {
  return [
    { url: `https://logo.clearbit.com/${domain}?size=256`, rank: 10 },
    { url: `https://icons.duckduckgo.com/ip3/${domain}.ico`, rank: 11 },
    { url: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`, rank: 12 },
  ];
}

export type LogoSearchResult = { logoUrl: string; foundVia: string } | null;

// Tries every candidate, best-ranked first, stopping at the first real
// image. Returns both the resulting R2 URL and which strategy actually hit
// — recorded in the Excel report so a human can spot-check the weaker ones
// (og:image and the Google favicon fallback are the two worth a manual look).
export async function searchLogo(domain: string, websiteUrl: string | null): Promise<LogoSearchResult> {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "");
  if (!safeDomain) return null;

  let homepageCandidates: Candidate[] = [];
  if (websiteUrl) {
    try {
      homepageCandidates = await candidatesFromHomepage(websiteUrl);
    } catch {
      // Homepage fetch failed (dead site, timeout, etc.) — fall through to
      // third-party lookups, which only need the bare domain.
    }
  }

  const candidates = [...homepageCandidates, ...thirdPartyCandidates(safeDomain)].sort((a, b) => a.rank - b.rank);

  for (const candidate of candidates) {
    const hit = await tryDownload(candidate.url);
    if (!hit) continue;

    const ext = extensionFor(hit.contentType);
    const key = `logos/${safeDomain}.${ext}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: hit.buffer,
        ContentType: hit.contentType,
      })
    );
    const via =
      candidate.rank <= 2 ? "site-icon" : candidate.rank === 3 ? "og-image" : candidate.rank === 10
        ? "clearbit"
        : candidate.rank === 11
          ? "duckduckgo"
          : "google-favicon";
    return { logoUrl: `${R2_PUBLIC_URL}/${key}`, foundVia: via };
  }

  return null;
}

// Fetch once, cache — CLAUDE.md §6/§7: resolve a domain's logo one time and
// store it ourselves, never a live favicon hotlink/redirect at render time.
// This is exactly the design that was skipped when the demo seed first went
// out with a direct icons.duckduckgo.com URL — that caused three separate
// failures in a row (a dead provider, an ad-blocked provider, and a
// CORS-blocked provider) that a self-hosted copy sidesteps entirely: once
// the bytes are ours, <img> tags AND MapLibre's WebGL texture loader both
// just work, no proxy needed.
//
// Storage is local (apps/web/public/logos/) for now, same interim pattern
// as the self-hosted PMTiles file — move to Cloudflare R2 before deploying
// to Vercel, since serverless functions there have a read-only filesystem
// at runtime and can't write here. Only this function needs to change.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGOS_DIR = path.join(__dirname, "../../../../apps/web/public/logos");

function extensionFor(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("icon")) return "ico";
  return "png";
}

// Returns the public path (e.g. "/logos/nykaa.com.png") to use as logo_url,
// or null if no logo could be fetched — callers should leave logo_url null
// in that case, which is a handled state (CompanyLogo.tsx renders an
// initials avatar), not an error.
export async function fetchAndCacheLogo(domain: string): Promise<string | null> {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "");
  if (!safeDomain) return null;

  // Already cached from a previous run — don't re-fetch. Any extension
  // counts as a hit; we don't know in advance which one a first-time fetch
  // will produce.
  await fs.mkdir(LOGOS_DIR, { recursive: true });
  const existing = await fs.readdir(LOGOS_DIR);
  const cached = existing.find((f) => f.startsWith(`${safeDomain}.`));
  if (cached) return `/logos/${cached}`;

  try {
    // A ~800-domain backfill runs these sequentially (see cache-logos.ts) —
    // one hung request with no timeout would silently stall the entire run
    // with zero output, indistinguishable from a crash.
    const res = await fetch(`https://icons.duckduckgo.com/ip3/${safeDomain}.ico`, {
      headers: { "User-Agent": "startup-atlas/0.1 (contact: parthsohaney04@gmail.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "image/png";
    const ext = extensionFor(contentType);
    const filename = `${safeDomain}.${ext}`;
    const buffer = Buffer.from(await res.arrayBuffer());

    await fs.writeFile(path.join(LOGOS_DIR, filename), buffer);
    return `/logos/${filename}`;
  } catch {
    return null;
  }
}

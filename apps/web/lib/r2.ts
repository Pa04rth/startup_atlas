// Uploads a buffer straight to Cloudflare R2 — the same bucket and
// credentials services/pipeline/src/lib/logos.ts uses for pipeline-sourced
// logos, but this half runs inside apps/web for content that only exists
// once a human acts in the browser: a submitted company's logo (uploaded
// via /submit, held as base64 in submissions.raw until an admin approves
// it — see lib/admin/actions.ts) and referral-offer proof screenshots.
// Vercel's serverless functions have a read-only filesystem at runtime, so
// this is the only place bytes from a form upload can end up — never the
// local disk.
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let client: S3Client | null = null;
function r2(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

export function extensionForContentType(contentType: string): string {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}

// key should already include its folder prefix, e.g. "logos/acme.com.png"
// or "referral-proofs/<uuid>.jpg". Returns the public R2 URL.
export async function uploadBufferToR2(
  key: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  await r2().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

// Same domain-favicon-via-DuckDuckGo approach as
// services/pipeline/src/lib/logos.ts, duplicated here (not imported —
// apps/web doesn't depend on services/pipeline) so any admin action that
// publishes a brand can automatically fill in a logo if one's missing,
// not just the pipeline's own upsert step. Same R2 key convention
// (logos/{domain}.{ext}) so both sides stay consistent and never fetch the
// same domain's favicon twice. Returns null (never throws) on any
// failure — a missing logo is a handled state (CompanyLogo.tsx falls back
// to an initials avatar), not something that should block an approval.
const FAVICON_EXTENSIONS = ["png", "jpg", "svg", "ico"];

export async function fetchAndCacheLogoForDomain(domain: string): Promise<string | null> {
  const safeDomain = domain.replace(/[^a-z0-9.-]/gi, "");
  if (!safeDomain) return null;

  for (const ext of FAVICON_EXTENSIONS) {
    const key = `logos/${safeDomain}.${ext}`;
    try {
      await r2().send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
      return `${R2_PUBLIC_URL}/${key}`;
    } catch {
      // doesn't exist under this extension, try the next
    }
  }

  try {
    const res = await fetch(`https://icons.duckduckgo.com/ip3/${safeDomain}.ico`, {
      headers: { "User-Agent": "startup-atlas/0.1 (contact: parthsohaney04@gmail.com)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/png";
    const buffer = Buffer.from(await res.arrayBuffer());
    return await uploadBufferToR2(`logos/${safeDomain}.${extensionForContentType(contentType)}`, buffer, contentType);
  } catch {
    return null;
  }
}

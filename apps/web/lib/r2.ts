// Uploads a buffer straight to Cloudflare R2 — the same bucket and
// credentials services/pipeline/src/lib/logos.ts uses for pipeline-sourced
// logos, but this half runs inside apps/web for content that only exists
// once a human acts in the browser: a submitted company's logo (uploaded
// via /submit, held as base64 in submissions.raw until an admin approves
// it — see lib/admin/actions.ts) and referral-offer proof screenshots.
// Vercel's serverless functions have a read-only filesystem at runtime, so
// this is the only place bytes from a form upload can end up — never the
// local disk.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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

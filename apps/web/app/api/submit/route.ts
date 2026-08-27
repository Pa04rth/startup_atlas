import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { cities } from "@startup-atlas/config";
import { createSubmission } from "@startup-atlas/db";

const CITY_IDS = cities.map((c) => c.id) as [string, ...string[]];

const schema = z.object({
  cityId: z.enum(CITY_IDS),
  name: z.string().trim().min(1).max(200),
  website: z.string().trim().url().max(500).optional().or(z.literal("")),
  tagline: z.string().trim().max(300).optional().or(z.literal("")),
  stage: z.string().trim().max(100).optional().or(z.literal("")),
  hiring: z.string().optional(), // checkbox: "on" or absent from FormData
  jobsUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  honeypot: z.string().max(0), // must be empty — see SubmitForm.tsx
});

const MAX_LOGO_BYTES = 1_000_000; // 1MB
const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

// Saved to the local filesystem — works in `next dev` / a traditional Node
// server, but Vercel's serverless functions have a read-only filesystem at
// runtime and can't write here. Swap this for an upload to Cloudflare R2
// before deploying — same interim-local-storage pattern already applied to
// the self-hosted map tiles and cached company logos (see
// infra/pmtiles/README.md and services/pipeline/src/lib/logos.ts).
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads", "logos");

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const fields = Object.fromEntries(
    ["cityId", "name", "website", "tagline", "stage", "hiring", "jobsUrl", "email"].map((key) => [
      key,
      formData.get(key)?.toString() ?? "",
    ])
  );
  // Never trust client-side-only validation — re-check everything here,
  // including the honeypot (a bot could POST directly, skipping the form).
  const parsed = schema.safeParse({ ...fields, honeypot: formData.get("website_url")?.toString() ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;

  let logoPath: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    const ext = LOGO_EXTENSIONS[logo.type];
    if (!ext) {
      return NextResponse.json({ error: "Logo must be PNG, JPG, or SVG." }, { status: 400 });
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "Logo must be under 1MB." }, { status: 400 });
    }
    const filename = `${randomUUID()}.${ext}`;
    await mkdir(UPLOADS_DIR, { recursive: true });
    await writeFile(path.join(UPLOADS_DIR, filename), Buffer.from(await logo.arrayBuffer()));
    logoPath = `/uploads/logos/${filename}`;
  }

  const { id } = await createSubmission({
    cityId: data.cityId,
    name: data.name,
    website: data.website || null,
    tagline: data.tagline || null,
    stage: data.stage || null,
    hiring: data.hiring === "on",
    jobsUrl: data.jobsUrl || null,
    email: data.email || null,
    raw: { ...data, logoPath },
  });

  return NextResponse.json({ ok: true, id });
}

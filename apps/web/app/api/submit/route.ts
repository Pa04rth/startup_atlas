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
  // Carried in the submission's raw JSON (no dedicated columns) and applied
  // on approval — see convertSubmissionToBrand, which uses `area` to place
  // the pin at that area's centroid instead of the city's when we already
  // have offices there.
  sector: z.string().trim().max(100).optional().or(z.literal("")),
  area: z.string().trim().max(120).optional().or(z.literal("")),
  hiring: z.string().optional(), // checkbox: "on" or absent from FormData
  jobsUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  honeypot: z.string().max(0), // must be empty — see SubmitForm.tsx
  // Present only from the "Manage company" edit flow (ManageCompanyForm) —
  // absent/empty means this is a brand-new-company submission.
  // `.or(z.literal(""))` matters: `fields` below reads every key with a
  // `?? ""` fallback, so a form with no `kind` input (SubmitForm — only
  // ManageCompanyForm sets it, to "edit") sends an empty string, not
  // undefined. Without this the whole new-company path 400s on every
  // submission. Same reason targetBrandId allows "".
  kind: z.enum(["new", "edit"]).optional().or(z.literal("")),
  targetBrandId: z.string().uuid().optional().or(z.literal("")),
});

// Individual openings a company adds itself (ManageCompanyForm's "Open
// roles" section), carried in the submission's raw JSON and written to
// job_postings only once an admin approves — same review gate as every
// other field. Walk-in venue/date are self-reported here rather than
// extracted from a job board (services/pipeline/src/lib/walkin.ts covers
// the automated path), which is exactly why they can't skip review.
const roleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  applyUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  isWalkin: z.boolean(),
  venue: z.string().trim().max(300).optional().or(z.literal("")),
  // datetime-local sends "YYYY-MM-DDTHH:mm" (no timezone/seconds), so this
  // can't use z.string().datetime().
  walkinAt: z.string().trim().max(40).optional().or(z.literal("")),
});
const rolesSchema = z.array(roleSchema).max(10);

export type SubmittedRole = z.infer<typeof roleSchema>;

const MAX_LOGO_BYTES = 1_000_000; // 1MB
const LOGO_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]);

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const fields = Object.fromEntries(
    ["cityId", "name", "website", "tagline", "stage", "sector", "area", "hiring", "jobsUrl", "email", "kind", "targetBrandId"].map(
      (key) => [key, formData.get(key)?.toString() ?? ""]
    )
  );
  // Never trust client-side-only validation — re-check everything here,
  // including the honeypot (a bot could POST directly, skipping the form).
  const parsed = schema.safeParse({ ...fields, honeypot: formData.get("website_url")?.toString() ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;
  const kind = data.kind === "edit" ? "edit" : "new";
  if (kind === "edit" && !data.targetBrandId) {
    return NextResponse.json({ error: "Missing company to edit." }, { status: 400 });
  }

  // Absent for the new-company form; malformed JSON is a rejection rather
  // than a silent drop, so a broken client can't quietly lose someone's
  // roles while the rest of their submission succeeds.
  const rolesRaw = formData.get("roles")?.toString();
  let roles: z.infer<typeof rolesSchema> = [];
  if (rolesRaw) {
    let decoded: unknown;
    try {
      decoded = JSON.parse(rolesRaw);
    } catch {
      return NextResponse.json({ error: "Invalid roles." }, { status: 400 });
    }
    const parsedRoles = rolesSchema.safeParse(decoded);
    if (!parsedRoles.success) {
      return NextResponse.json({ error: "Invalid roles." }, { status: 400 });
    }
    roles = parsedRoles.data;
  }

  // Held as base64 inside the submission's raw JSON until an admin
  // approves it — Vercel's serverless functions can't write to local disk,
  // and we don't want to fill R2 with logos for spam/rejected submissions.
  // The actual R2 upload happens in lib/admin/actions.ts's approveSubmission,
  // see apps/web/lib/r2.ts.
  let logoBase64: string | null = null;
  let logoContentType: string | null = null;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!LOGO_CONTENT_TYPES.has(logo.type)) {
      return NextResponse.json({ error: "Logo must be PNG, JPG, SVG, or WEBP." }, { status: 400 });
    }
    if (logo.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "Logo must be under 1MB." }, { status: 400 });
    }
    logoContentType = logo.type;
    logoBase64 = Buffer.from(await logo.arrayBuffer()).toString("base64");
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
    kind,
    targetBrandId: data.targetBrandId || null,
    raw: { ...data, roles, logoBase64, logoContentType },
  });

  return NextResponse.json({ ok: true, id });
}

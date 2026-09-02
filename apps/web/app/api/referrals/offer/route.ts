import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createReferralOffer, getBrandBySlug } from "@startup-atlas/db";
import { cities } from "@startup-atlas/config";
import { uploadBufferToR2, extensionForContentType } from "@/lib/r2";

const CITY_IDS = cities.map((c) => c.id) as [string, ...string[]];

const schema = z.object({
  cityId: z.enum(CITY_IDS),
  brandSlug: z.string().trim().min(1).max(200),
  jobPostingId: z.string().optional().or(z.literal("")),
  jobTitle: z.string().trim().min(1).max(200),
  referrerName: z.string().trim().min(1).max(200),
  referrerEmail: z.string().trim().email().max(200),
  referrerRole: z.string().trim().max(200).optional().or(z.literal("")),
  referrerLinkedin: z.string().trim().url().max(300).optional().or(z.literal("")),
  proofNote: z.string().trim().max(500).optional().or(z.literal("")),
  pitch: z.string().trim().max(500).optional().or(z.literal("")),
  honeypot: z.string().max(0),
});

const MAX_PROOF_BYTES = 3_000_000; // 3MB — a phone photo of a badge/laptop screen
const PROOF_CONTENT_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// Posting an offer never touches the public map by itself — it lands as
// `status='pending'` and only shows on the company profile once an admin
// has looked at the proof image and approved it (apps/web/app/admin/(panel)
// /referrals/page.tsx). The proof upload goes straight to R2 (not held as
// base64 like a submission logo) because a moderator needs to actually see
// it to decide, and this table — unlike `submissions` — is never bulk-
// imported, so there's no spam-volume concern with uploading eagerly.
export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const fields = Object.fromEntries(
    [
      "cityId",
      "brandSlug",
      "jobPostingId",
      "jobTitle",
      "referrerName",
      "referrerEmail",
      "referrerRole",
      "referrerLinkedin",
      "proofNote",
      "pitch",
    ].map((key) => [key, formData.get(key)?.toString() ?? ""])
  );
  const parsed = schema.safeParse({ ...fields, honeypot: formData.get("website_url")?.toString() ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;

  const brand = await getBrandBySlug(data.cityId, data.brandSlug);
  if (!brand) {
    return NextResponse.json({ error: "Company not found." }, { status: 404 });
  }

  const proof = formData.get("proof");
  if (!(proof instanceof File) || proof.size === 0) {
    return NextResponse.json({ error: "Proof of employment is required." }, { status: 400 });
  }
  if (!PROOF_CONTENT_TYPES.has(proof.type)) {
    return NextResponse.json({ error: "Proof must be a PNG, JPG, or WEBP image." }, { status: 400 });
  }
  if (proof.size > MAX_PROOF_BYTES) {
    return NextResponse.json({ error: "Proof image must be under 3MB." }, { status: 400 });
  }

  const ext = extensionForContentType(proof.type);
  const proofUrl = await uploadBufferToR2(
    `referral-proofs/${randomUUID()}.${ext}`,
    Buffer.from(await proof.arrayBuffer()),
    proof.type
  );

  const jobPostingId = data.jobPostingId ? Number(data.jobPostingId) : null;

  const { id } = await createReferralOffer({
    brandId: brand.id,
    jobPostingId: Number.isInteger(jobPostingId) ? jobPostingId : null,
    jobTitle: data.jobTitle,
    referrerName: data.referrerName,
    referrerEmail: data.referrerEmail,
    referrerRole: data.referrerRole || null,
    referrerLinkedin: data.referrerLinkedin || null,
    proofUrl,
    proofNote: data.proofNote || null,
    pitch: data.pitch || null,
  });

  return NextResponse.json({ ok: true, id });
}

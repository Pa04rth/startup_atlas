"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cities } from "@startup-atlas/config";
import {
  setBrandStatus,
  setBrandStatusBulk,
  setSubmissionStatus,
  approveVerification,
  rejectVerification,
  getSubmissionById,
  convertSubmissionToBrand,
  applyEditSubmission,
  insertSubmittedRoles,
  setBrandLogoUrl,
  setReferralOfferStatus,
  setReferralRequestStatus,
  type ReferralRequestStatus,
  getBrandForAdmin,
  updateBrandFacts,
  getBrandsLogoInfo,
} from "@startup-atlas/db";
import { scoreRecord, tierFromScore, type LocPrecision } from "@startup-atlas/core";
import { uploadBufferToR2, extensionForContentType, fetchAndCacheLogoForDomain } from "@/lib/r2";
import { ADMIN_COOKIE_NAME, verifySessionCookieValue } from "./auth";

// Defense in depth: middleware.ts already gates every /admin/* request, but
// a server action is technically its own endpoint — re-check here too so a
// future refactor that imports this file from an ungated route can't
// silently skip auth.
async function requireAdmin(): Promise<void> {
  const store = await cookies();
  const session = store.get(ADMIN_COOKIE_NAME)?.value;
  if (!(await verifySessionCookieValue(session))) {
    throw new Error("Not authenticated");
  }
}

// Every path that can publish a brand (this, approveBrands below, and
// approveSubmission's convertSubmissionToBrand branch) should end with the
// same guarantee: a published brand either has a real logo_url or has
// honestly tried and failed to get one — never "published, logo pending
// because nobody remembered to run cache-logos." One place to do that
// fetch-if-missing check so every approval path stays consistent.
async function ensureLogo(id: string, domain: string | null, logoUrl: string | null): Promise<void> {
  if (logoUrl || !domain) return;
  const url = await fetchAndCacheLogoForDomain(domain);
  if (url) await setBrandLogoUrl(id, url);
}

export async function approveBrand(id: string) {
  await requireAdmin();
  await setBrandStatus(id, "published");
  const brand = await getBrandForAdmin(id);
  if (brand) await ensureLogo(id, brand.domain, brand.logoUrl);
  revalidatePath("/admin/review");
}

export async function archiveBrand(id: string) {
  await requireAdmin();
  await setBrandStatus(id, "archived");
  revalidatePath("/admin/review");
}

export async function approveBrands(ids: string[]) {
  await requireAdmin();
  await setBrandStatusBulk(ids, "published");
  const infos = await getBrandsLogoInfo(ids);
  await Promise.all(infos.map((b) => ensureLogo(b.id, b.domain, b.logoUrl)));
  revalidatePath("/admin/review");
}

export async function archiveBrands(ids: string[]) {
  await requireAdmin();
  await setBrandStatusBulk(ids, "archived");
  revalidatePath("/admin/review");
}

// Turns an approved submission into real, live data — the gap noted right
// on the submissions page: a 'new' submission becomes a real (honestly-
// scored) brand row, an 'edit' submission is applied onto the brand it
// targets. Either way, if the submitter attached a logo it's uploaded to
// R2 here (not at submission time — see api/submit/route.ts) and set as
// the brand's logo_url. Everything below only ever runs once the submitter
// has already been trusted by a human clicking "Approve".
export async function approveSubmission(id: number) {
  await requireAdmin();
  const submission = await getSubmissionById(id);
  if (!submission) return;

  let brandId: string | null = submission.targetBrandId;

  if (submission.kind === "edit") {
    await applyEditSubmission(submission);
  } else {
    const city = cities.find((c) => c.id === submission.cityId);
    if (!city) throw new Error(`Unknown city on submission ${id}: ${submission.cityId}`);
    const created = await convertSubmissionToBrand(submission, {
      lat: city.centerLat,
      lng: city.centerLng,
    });
    brandId = created.brandId;
    // Only ManageCompanyForm collects roles today (that's the "edit" path,
    // handled inside applyEditSubmission), but a new-company submission
    // carrying them shouldn't silently drop them if that ever changes.
    await insertSubmittedRoles(brandId, submission.cityId, submission.raw);
  }

  const raw = submission.raw as { logoBase64?: string; logoContentType?: string } | null;
  if (brandId && raw?.logoBase64 && raw?.logoContentType) {
    // Submitter attached a real logo — use it, it's more authoritative
    // than a guessed favicon.
    const buffer = Buffer.from(raw.logoBase64, "base64");
    const ext = extensionForContentType(raw.logoContentType);
    const url = await uploadBufferToR2(`logos/submission-${brandId}.${ext}`, buffer, raw.logoContentType);
    await setBrandLogoUrl(brandId, url);
  } else if (brandId) {
    // No logo attached — same auto-fetch-by-domain fallback every other
    // publish path gets, so "approved" always means "logo handled," not
    // "logo handled only if the pipeline or submitter happened to provide one."
    const current = await getBrandForAdmin(brandId);
    if (current) await ensureLogo(brandId, current.domain, current.logoUrl);
  }

  await setSubmissionStatus(id, "approved");
  revalidatePath("/admin/submissions");
  revalidatePath("/admin/review");
}

export async function rejectSubmission(id: number) {
  await requireAdmin();
  await setSubmissionStatus(id, "rejected");
  revalidatePath("/admin/submissions");
}

export async function approvePayment(id: number) {
  await requireAdmin();
  await approveVerification(id);
  revalidatePath("/admin/payments");
}

export async function rejectPayment(id: number, notes: string) {
  await requireAdmin();
  await rejectVerification(id, notes);
  revalidatePath("/admin/payments");
}

// apps/admin/brands/[id] — corrects the facts the pipeline scraped wrong
// (bad sector, missing founded_year, etc.). Never a raw status override —
// score/status are always recomputed from these fields via the same
// scoreRecord/tierFromScore packages/core uses everywhere else, so a
// correction can move a brand up (or down) a tier honestly instead of an
// admin just declaring it published.
export async function updateBrand(id: string, formData: FormData) {
  await requireAdmin();
  const current = await getBrandForAdmin(id);
  if (!current) throw new Error(`Brand ${id} not found`);

  const foundedYearRaw = formData.get("foundedYear")?.toString().trim();
  const fields = {
    name: formData.get("name")?.toString().trim() || current.name,
    tagline: formData.get("tagline")?.toString().trim() || null,
    description: formData.get("description")?.toString().trim() || null,
    sector: formData.get("sector")?.toString().trim() || null,
    stage: formData.get("stage")?.toString().trim() || null,
    website: formData.get("website")?.toString().trim() || null,
    domain: formData.get("domain")?.toString().trim() || null,
    foundedYear: foundedYearRaw ? Number(foundedYearRaw) : null,
    hiring: formData.get("hiring") === "on",
    kind: (formData.get("kind")?.toString() as "startup" | "vc" | "mnc") || current.kind,
  };

  let domain = fields.domain;
  if (!domain && fields.website) {
    try {
      domain = new URL(fields.website).hostname.replace(/^www\./, "");
    } catch {
      domain = null;
    }
  }

  const score = scoreRecord({
    hasWebsite: !!fields.website,
    hasDomain: !!domain,
    hasSector: !!fields.sector,
    hasStage: !!fields.stage,
    descriptionLength: fields.description?.length ?? 0,
    hasFoundedYear: !!fields.foundedYear,
    precision: (current.precision as LocPrecision | null) ?? "synthetic",
    seenInSourceCount: 1,
  });
  const status = tierFromScore(score);

  await updateBrandFacts(id, { ...fields, domain }, score, status);
  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${id}`);
  revalidatePath("/admin/review");
}

export async function approveReferralOffer(id: number) {
  await requireAdmin();
  await setReferralOfferStatus(id, "approved");
  revalidatePath("/admin/referrals");
}

export async function rejectReferralOffer(id: number, notes: string) {
  await requireAdmin();
  await setReferralOfferStatus(id, "rejected", notes);
  revalidatePath("/admin/referrals");
}

// The state machine after a candidate has paid (payment_verifications
// already flipped the row to 'paid' — see packages/db/queries/payments.ts):
// 'fulfilled' once the admin confirms the referrer actually referred the
// candidate, 'released' once the referrer's ₹80 cut has been paid by hand
// (UPI, same as everything else in this manual-QR system), or 'refunded'
// if delivery never happened. No automated split, ever — this mirrors the
// honesty CLAUDE.md §4/Phase 9 asks for on paid connect.
export async function setReferralRequestState(id: number, status: ReferralRequestStatus, notes?: string) {
  await requireAdmin();
  await setReferralRequestStatus(id, status, notes);
  revalidatePath("/admin/referrals");
}

// "Run ingest" (app/admin/(panel)/ingest/page.tsx) — Vercel's serverless
// functions can't run a long scraping job inline (BUILD_PLAN.md Phase 4),
// so this queues the actual work by firing GitHub Actions' workflow_dispatch
// REST API against .github/workflows/discovery.yml instead of scraping
// from within the request. Needs a GH_ACTIONS_TOKEN env var (a PAT with
// "Actions: write" on this repo) — without it this throws, which the page
// surfaces as an error rather than silently doing nothing.
export async function triggerIngest(city: "" | "pune" | "mumbai") {
  await requireAdmin();
  const token = process.env.GH_ACTIONS_TOKEN;
  if (!token) {
    throw new Error("GH_ACTIONS_TOKEN is not set — can't trigger the discovery workflow.");
  }
  const res = await fetch(
    "https://api.github.com/repos/Pa04rth/startup_atlas/actions/workflows/discovery.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main", inputs: { city } }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub API returned ${res.status}: ${body.slice(0, 300)}`);
  }
}

export async function logout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

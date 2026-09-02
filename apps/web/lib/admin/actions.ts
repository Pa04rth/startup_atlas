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
  setBrandLogoUrl,
  setReferralOfferStatus,
  setReferralRequestStatus,
  type ReferralRequestStatus,
} from "@startup-atlas/db";
import { uploadBufferToR2, extensionForContentType } from "@/lib/r2";
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

export async function approveBrand(id: string) {
  await requireAdmin();
  await setBrandStatus(id, "published");
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
  }

  const raw = submission.raw as { logoBase64?: string; logoContentType?: string } | null;
  if (brandId && raw?.logoBase64 && raw?.logoContentType) {
    const buffer = Buffer.from(raw.logoBase64, "base64");
    const ext = extensionForContentType(raw.logoContentType);
    const url = await uploadBufferToR2(`logos/submission-${brandId}.${ext}`, buffer, raw.logoContentType);
    await setBrandLogoUrl(brandId, url);
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

export async function logout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

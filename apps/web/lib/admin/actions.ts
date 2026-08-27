"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  setBrandStatus,
  setSubmissionStatus,
  approveVerification,
  rejectVerification,
} from "@startup-atlas/db";
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

export async function approveSubmission(id: number) {
  await requireAdmin();
  await setSubmissionStatus(id, "approved");
  revalidatePath("/admin/submissions");
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

export async function logout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

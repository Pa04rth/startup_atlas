"use client";

import { useState } from "react";
import { PaymentVerificationForm } from "./PaymentVerificationForm";
import type { PublicReferralOffer } from "@startup-atlas/db";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const labelClass = "block text-sm font-medium text-neutral-800";

export function ReferralRequestForm({ offer, onDone }: { offer: PublicReferralOffer; onDone: () => void }) {
  const [requestId, setRequestId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    if (form.get("website")) {
      setLoading(false);
      return;
    }

    const res = await fetch("/api/referrals/request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        offerId: offer.id,
        candidateName: form.get("candidateName"),
        candidateEmail: form.get("candidateEmail"),
        candidatePhone: form.get("candidatePhone") || undefined,
        resumeUrl: form.get("resumeUrl") || undefined,
        honeypot: form.get("website") || "",
      }),
    });

    setLoading(false);
    if (res.ok) {
      const body = await res.json();
      setRequestId(body.id);
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong — try again.");
    }
  }

  if (requestId) {
    return <PaymentVerificationForm kind="referral_request" referenceId={String(requestId)} amountInr={100} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />

      <div>
        <p className="text-sm font-semibold text-neutral-900">Referral for: {offer.jobTitle}</p>
        <p className="mt-1 text-xs text-neutral-500">
          from {offer.referrerName}
          {offer.referrerRole ? `, ${offer.referrerRole}` : ""}
        </p>
        {offer.pitch && <p className="mt-2 text-sm text-neutral-600">{offer.pitch}</p>}
      </div>

      <div className="rounded-lg bg-neutral-50 px-3.5 py-2.5 text-xs text-neutral-600">
        ₹100 total — <strong>₹80 goes to {offer.referrerName}</strong> once they refer you, ₹20 to the platform.
        We hold nothing back from what happens to your money: it's the same manual pay-and-verify flow used
        everywhere else on this site.
      </div>

      <div>
        <label className={labelClass}>Your name *</label>
        <input name="candidateName" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Your email *</label>
        <input name="candidateEmail" type="email" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Phone</label>
        <input name="candidatePhone" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Resume link (Drive, LinkedIn, etc.)</label>
        <input name="resumeUrl" type="url" placeholder="https://" className={inputClass} />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onDone} className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Continue to payment"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import type { BrandJobPosting } from "@startup-atlas/db";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const labelClass = "block text-sm font-medium text-neutral-800";

export function ReferralOfferForm({
  cityId,
  brandSlug,
  brandName,
  jobs,
  onDone,
}: {
  cityId: string;
  brandSlug: string;
  brandName: string;
  jobs: BrandJobPosting[];
  onDone: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [customJob, setCustomJob] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    if (form.get("website_url")) {
      setStatus("done");
      return;
    }
    form.set("cityId", cityId);
    form.set("brandSlug", brandSlug);

    const res = await fetch("/api/referrals/offer", { method: "POST", body: form });
    if (res.ok) {
      setStatus("done");
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong — try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">✓</div>
        <p className="mt-3 text-sm font-medium text-emerald-900">
          Thanks — we&apos;ll review your proof and publish the offer once verified.
        </p>
        <button type="button" onClick={onDone} className="mt-3 text-sm font-medium text-emerald-700 hover:underline">
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />

      <div className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
        A candidate pays <strong>₹100</strong> to be referred through you — <strong>₹80 goes to you</strong>, ₹20 to
        the platform, once you&apos;ve actually referred them and we confirm it.
      </div>

      <div>
        <label className={labelClass}>Which role at {brandName}?</label>
        {jobs.length > 0 && !customJob ? (
          <>
            <select
              name="jobPostingId"
              required
              className={inputClass}
              onChange={(e) => {
                const opt = e.currentTarget.selectedOptions[0];
                const hidden = e.currentTarget.form?.elements.namedItem("jobTitle") as HTMLInputElement | null;
                if (hidden) hidden.value = opt.dataset.title ?? "";
              }}
            >
              <option value="">Select an open role…</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id} data-title={j.title ?? "Open role"}>
                  {j.title ?? "Open role"}
                </option>
              ))}
            </select>
            <input type="hidden" name="jobTitle" />
            <button type="button" onClick={() => setCustomJob(true)} className="mt-1.5 text-xs text-neutral-500 hover:underline">
              Role not listed? Enter it manually
            </button>
          </>
        ) : (
          <input name="jobTitle" required placeholder="e.g. Senior Backend Engineer" className={inputClass} />
        )}
      </div>

      <div>
        <label className={labelClass}>Your name *</label>
        <input name="referrerName" required className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Your work email *</label>
        <input name="referrerEmail" type="email" required placeholder="you@company.com" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Your role/title</label>
        <input name="referrerRole" placeholder="e.g. Senior Engineer" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>LinkedIn profile</label>
        <input name="referrerLinkedin" type="url" placeholder="https://linkedin.com/in/you" className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Proof you work here — not a government ID *</label>
        <input
          name="proof"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
          className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-neutral-700 file:transition hover:file:bg-neutral-200"
        />
        <p className="mt-1.5 text-xs text-neutral-400">
          Anything that shows you actually work at {brandName} and you&apos;re comfortable sharing: an employee badge,
          a laptop screen with an internal tool/Slack open, an email signature, or a payslip with the amount blacked
          out. PNG/JPG/WEBP, under 3MB. An admin reviews this before your offer goes live — never shown publicly.
        </p>
        <input
          name="proofNote"
          placeholder="What does this image show? (optional, helps the reviewer)"
          className={`${inputClass} mt-2`}
        />
      </div>

      <div>
        <label className={labelClass}>Pitch to candidates</label>
        <textarea
          name="pitch"
          rows={2}
          placeholder="Why should someone want your referral? (optional)"
          className={inputClass}
        />
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

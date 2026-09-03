"use client";

import { useState } from "react";
import type { BrandJobPosting } from "@startup-atlas/db";

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
      <div className="py-6 text-center">
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg"
          style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
        >
          ✓
        </div>
        <p className="mt-3 text-sm font-medium">
          Thanks — we&apos;ll review your proof and publish the offer once verified.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-3 text-sm font-medium underline"
          style={{ color: "var(--color-accent-700)" }}
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />

      <div
        className="rounded-sm border px-3.5 py-2.5 text-xs"
        style={{ borderColor: "var(--color-divider)", background: "var(--color-bg)", color: "var(--color-neutral-700)" }}
      >
        A candidate pays <strong>₹100</strong> to be referred through you — <strong>₹80 goes to you</strong>, ₹20 to
        the platform, once you&apos;ve actually referred them and we confirm it.
      </div>

      <div>
        <label className="fl">Which role at {brandName}?</label>
        {jobs.length > 0 && !customJob ? (
          <>
            <select
              name="jobPostingId"
              required
              
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
            <button type="button" onClick={() => setCustomJob(true)} className="mt-1.5 text-xs underline" style={{ color: "var(--color-neutral-600)" }}>
              Role not listed? Enter it manually
            </button>
          </>
        ) : (
          <input name="jobTitle" required placeholder="e.g. Senior Backend Engineer"  />
        )}
      </div>

      <div>
        <label className="fl">Your name *</label>
        <input name="referrerName" required  />
      </div>

      <div>
        <label className="fl">Your work email *</label>
        <input name="referrerEmail" type="email" required placeholder="you@company.com"  />
      </div>

      <div>
        <label className="fl">Your role/title</label>
        <input name="referrerRole" placeholder="e.g. Senior Engineer"  />
      </div>

      <div>
        <label className="fl">LinkedIn profile</label>
        <input name="referrerLinkedin" type="url" placeholder="https://linkedin.com/in/you"  />
      </div>

      <div>
        <label className="fl">Proof you work here — not a government ID *</label>
        <input
          name="proof"
          type="file"
          required
          accept="image/png,image/jpeg,image/webp"
          className="!p-0 file:mr-3 file:cursor-pointer file:border-0 file:bg-[var(--color-neutral-100)] file:px-3.5 file:py-2.5 file:text-sm file:text-[var(--color-neutral-800)]"
        />
        <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
          Anything that shows you actually work at {brandName} and you&apos;re comfortable sharing: an employee badge,
          a laptop screen with an internal tool/Slack open, an email signature, or a payslip with the amount blacked
          out. PNG/JPG/WEBP, under 3MB. An admin reviews this before your offer goes live — never shown publicly.
        </p>
        <input
          name="proofNote"
          placeholder="What does this image show? (optional, helps the reviewer)"
          className="mt-2"
        />
      </div>

      <div>
        <label className="fl">Pitch to candidates</label>
        <textarea
          name="pitch"
          rows={2}
          placeholder="Why should someone want your referral? (optional)"
          
        />
      </div>

      {error && (
        <p className="rounded-sm border px-3.5 py-2.5 text-sm" style={{ borderColor: "#b3543f", color: "#b3543f" }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="cf-primary">
        {status === "submitting" ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { cardClass, inputClass, labelClass, sectionTitleClass, primaryButtonClass, errorClass, successCardClass, fileInputClass } from "./ui";

export function ManageCompanyForm({
  cityId,
  brandId,
  brandName,
  initial,
}: {
  cityId: string;
  brandId: string;
  brandName: string;
  initial: {
    website: string | null;
    tagline: string | null;
    stage: string | null;
    hiring: boolean;
    jobsUrl?: string | null;
  };
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    if (form.get("website_url")) {
      setStatus("done");
      return;
    }

    const res = await fetch("/api/submit", { method: "POST", body: form });
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
      <div className={successCardClass}>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">
          ✓
        </div>
        <p className="mt-3 text-sm font-medium text-emerald-900">
          Thanks — your changes are queued for admin review before they go live.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />
      <input type="hidden" name="kind" value="edit" />
      <input type="hidden" name="targetBrandId" value={brandId} />
      <input type="hidden" name="cityId" value={cityId} />
      <input type="hidden" name="name" value={brandName} />

      <section className="space-y-4">
        <h2 className={sectionTitleClass}>
          Update {brandName}&apos;s listing
        </h2>

        <div>
          <label className={labelClass}>Website</label>
          <input name="website" type="url" defaultValue={initial.website ?? ""} placeholder="https://" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Logo</label>
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className={fileInputClass}
          />
          <p className="mt-1.5 text-xs text-neutral-400">PNG, JPG, SVG, or WEBP, under 1MB — leave blank to keep the current logo.</p>
        </div>

        <div>
          <label className={labelClass}>One-line tagline</label>
          <input name="tagline" defaultValue={initial.tagline ?? ""} placeholder="What do you do, in one sentence?" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Stage</label>
          <input name="stage" defaultValue={initial.stage ?? ""} placeholder="e.g. Seed, Bootstrapped" className={inputClass} />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
          <input type="checkbox" name="hiring" defaultChecked={initial.hiring} className="h-4 w-4 rounded border-neutral-300 accent-emerald-600" />
          Currently hiring
        </label>

        <div>
          <label className={labelClass}>Jobs / careers page URL</label>
          <input name="jobsUrl" type="url" defaultValue={initial.jobsUrl ?? ""} placeholder="https://" className={inputClass} />
        </div>
      </section>

      <section className="space-y-4 border-t border-neutral-100 pt-6">
        <h2 className={sectionTitleClass}>Your contact</h2>
        <div>
          <label className={labelClass}>Email (for follow-up, not published)</label>
          <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
        </div>
      </section>

      {error && <p className={errorClass}>{error}</p>}

      <button type="submit" disabled={status === "submitting"} className={primaryButtonClass}>
        {status === "submitting" ? "Submitting…" : "Submit changes for review"}
      </button>
    </form>
  );
}

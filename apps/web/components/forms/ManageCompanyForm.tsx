"use client";

import { useState } from "react";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const labelClass = "block text-sm font-medium text-neutral-800";

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
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">
          ✓
        </div>
        <p className="mt-3 text-sm font-medium text-emerald-900">
          Thanks — your changes are queued for admin review before they go live.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />
      <input type="hidden" name="kind" value="edit" />
      <input type="hidden" name="targetBrandId" value={brandId} />
      <input type="hidden" name="cityId" value={cityId} />
      <input type="hidden" name="name" value={brandName} />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
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
            className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-neutral-700 file:transition hover:file:bg-neutral-200"
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
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Your contact</h2>
        <div>
          <label className={labelClass}>Email (for follow-up, not published)</label>
          <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
        </div>
      </section>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit changes for review"}
      </button>
    </form>
  );
}

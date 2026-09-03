"use client";

import { useState } from "react";

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
      <div className="cf-card px-6 py-10 text-center sm:px-8">
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg"
          style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
        >
          ✓
        </div>
        <p className="mt-4 text-sm font-medium">
          Thanks — your changes are queued for admin review before they go live.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="website_url" tabIndex={-1} autoComplete="off" className="absolute left-[-9999px]" aria-hidden="true" />
      <input type="hidden" name="kind" value="edit" />
      <input type="hidden" name="targetBrandId" value={brandId} />
      <input type="hidden" name="cityId" value={cityId} />
      <input type="hidden" name="name" value={brandName} />

      <div className="border-b px-6 py-[22px] sm:px-8" style={{ borderColor: "var(--color-divider)" }}>
        <span className="sec-lbl">Update {brandName}&apos;s listing</span>
        <h2 className="mt-2.5 text-xl font-semibold sm:text-2xl">Manage this listing</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
          Every edit goes through admin review before it appears publicly.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
        <div>
          <label className="fl">Website</label>
          <input name="website" type="url" defaultValue={initial.website ?? ""} placeholder="https://" />
        </div>

        <div>
          <label className="fl">Logo</label>
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="!p-0 file:mr-3 file:cursor-pointer file:border-0 file:bg-[var(--color-neutral-100)] file:px-3.5 file:py-2.5 file:text-sm file:text-[var(--color-neutral-800)]"
          />
          <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
            PNG, JPG, SVG, or WEBP, under 1MB — leave blank to keep the current logo.
          </p>
        </div>

        <div>
          <label className="fl">One-line tagline</label>
          <input name="tagline" defaultValue={initial.tagline ?? ""} placeholder="What do you do, in one sentence?" />
        </div>

        <div>
          <label className="fl">Stage</label>
          <input name="stage" defaultValue={initial.stage ?? ""} placeholder="e.g. Seed, Bootstrapped" />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]" style={{ color: "var(--color-neutral-800)" }}>
          <input type="checkbox" name="hiring" defaultChecked={initial.hiring} className="!w-auto accent-[var(--color-accent-500)]" />
          Currently hiring
        </label>

        <div>
          <label className="fl">Jobs / careers page URL</label>
          <input name="jobsUrl" type="url" defaultValue={initial.jobsUrl ?? ""} placeholder="https://" />
        </div>

        <div className="flex flex-col gap-4 border-t pt-5" style={{ borderColor: "var(--color-divider)" }}>
          <div className="sec-lbl">Your contact</div>
          <div>
            <label className="fl">Email (for follow-up, not published)</label>
            <input name="email" type="email" placeholder="you@company.com" />
          </div>
        </div>

        {error && (
          <p className="rounded-sm border px-3.5 py-2.5 text-sm" style={{ borderColor: "#b3543f", color: "#b3543f" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={status === "submitting"} className="cf-primary">
          {status === "submitting" ? "Submitting…" : "Submit changes for review →"}
        </button>
      </div>
    </form>
  );
}

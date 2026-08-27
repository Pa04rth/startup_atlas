"use client";

import { useState } from "react";
import { cities } from "@startup-atlas/config";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const labelClass = "block text-sm font-medium text-neutral-800";

export function SubmitForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    // Honeypot: real users never see or fill this field (see the hidden
    // input below). A bot filling every field trips this.
    if (form.get("website_url")) {
      setStatus("done");
      return;
    }

    // Sent as multipart/form-data (not JSON) so the logo file can ride
    // along in the same request — the browser sets the correct
    // Content-Type/boundary automatically when body is a FormData.
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
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">✓</div>
        <p className="mt-3 text-sm font-medium text-emerald-900">Thanks — we'll review it and add it to the map.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      {/* Honeypot — hidden from real users via CSS, bots fill every field */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Company</h2>

        <div>
          <label className={labelClass}>City</label>
          <select name="cityId" required className={inputClass}>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Company name *</label>
          <input name="name" required placeholder="e.g. Acme Robotics" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Website</label>
          <input name="website" type="url" placeholder="https://" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Logo</label>
          <input
            name="logo"
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="mt-1.5 w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3.5 file:py-2 file:text-sm file:font-medium file:text-neutral-700 file:transition hover:file:bg-neutral-200"
          />
          <p className="mt-1.5 text-xs text-neutral-400">
            PNG, JPG, or SVG, under 1MB — optional, we'll fetch one automatically if you skip this.
          </p>
        </div>

        <div>
          <label className={labelClass}>One-line tagline</label>
          <input name="tagline" placeholder="What do you do, in one sentence?" className={inputClass} />
        </div>
      </section>

      <section className="space-y-4 border-t border-neutral-100 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Hiring</h2>

        <div>
          <label className={labelClass}>Stage</label>
          <input name="stage" placeholder="e.g. Seed, Bootstrapped" className={inputClass} />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-neutral-700">
          <input type="checkbox" name="hiring" className="h-4 w-4 rounded border-neutral-300 accent-emerald-600" />
          Currently hiring
        </label>

        <div>
          <label className={labelClass}>Jobs page URL</label>
          <input name="jobsUrl" type="url" placeholder="https://" className={inputClass} />
        </div>
      </section>

      <section className="space-y-4 border-t border-neutral-100 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Your contact</h2>
        <div>
          <label className={labelClass}>Email (for follow-up, not published)</label>
          <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
        </div>
      </section>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

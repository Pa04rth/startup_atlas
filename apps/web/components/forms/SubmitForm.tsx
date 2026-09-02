"use client";

import { useState } from "react";
import { cities } from "@startup-atlas/config";
import { cardClass, inputClass, labelClass, sectionTitleClass, primaryButtonClass, errorClass, successCardClass, fileInputClass } from "./ui";

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
      <div className={successCardClass}>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">✓</div>
        <p className="mt-3 text-sm font-medium text-emerald-900">Thanks — we'll review it and add it to the map.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cardClass}>
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
        <h2 className={sectionTitleClass}>Company</h2>

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
            className={fileInputClass}
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
        <h2 className={sectionTitleClass}>Hiring</h2>

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
        <h2 className={sectionTitleClass}>Your contact</h2>
        <div>
          <label className={labelClass}>Email (for follow-up, not published)</label>
          <input name="email" type="email" placeholder="you@company.com" className={inputClass} />
        </div>
      </section>

      {error && <p className={errorClass}>{error}</p>}

      <button type="submit" disabled={status === "submitting"} className={primaryButtonClass}>
        {status === "submitting" ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import { cities, SECTORS, STAGES } from "@startup-atlas/config";

// areasByCity: the area names already on the map for each city (see
// getAreasByCity). Offered as datalist suggestions rather than a closed
// dropdown — a submitter in a neighbourhood we haven't mapped yet still
// needs to be able to name it.
export function SubmitForm({ areasByCity = {} }: { areasByCity?: Record<string, string[]> }) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cityId, setCityId] = useState<string>(cities[0]?.id ?? "");

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
      <div className="cf-card px-6 py-10 text-center sm:px-8">
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg"
          style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
        >
          ✓
        </div>
        <p className="mt-4 text-sm font-medium">Thanks — we&apos;ll review it and add it to the map.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Honeypot — hidden from real users via CSS, bots fill every field */}
      <input
        type="text"
        name="website_url"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <div className="flex items-baseline justify-between border-b px-6 py-[22px] sm:px-8" style={{ borderColor: "var(--color-divider)" }}>
        <span className="sec-lbl">Submit or claim a listing</span>
      </div>

      <div className="px-6 pt-[22px] sm:px-8">
        <h2 className="m-0 text-xl font-semibold sm:text-2xl">Tell us about the company</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
          Know a startup that belongs here? Add it, or claim your own listing so its details stay
          accurate.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-6 pb-8 pt-6 sm:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="fl">
              City <span className="req">*</span>
            </label>
            <select name="cityId" required value={cityId} onChange={(e) => setCityId(e.target.value)}>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="fl">Area</label>
            <input name="area" list="submit-areas" placeholder="e.g. Koregaon Park" />
            <datalist id="submit-areas">
              {(areasByCity[cityId] ?? []).map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
            <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
              Which part of the city? Helps us place the pin properly.
            </p>
          </div>
        </div>

        <div>
          <label className="fl">
            Company name <span className="req">*</span>
          </label>
          <input name="name" required placeholder="e.g. Acme Robotics" />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className="fl">Sector</label>
            <select name="sector" defaultValue="">
              <option value="">Choose a sector</option>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="fl">Stage</label>
            <select name="stage" defaultValue="">
              <option value="">Choose a stage</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="fl">Website</label>
          <input name="website" type="url" placeholder="https://" />
          <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
            Use the public company website, if there is one.
          </p>
        </div>

        <div>
          <label className="fl">Logo</label>
          <input name="logo" type="file" accept="image/png,image/jpeg,image/svg+xml" className="!p-0 file:mr-3 file:cursor-pointer file:border-0 file:bg-[var(--color-neutral-100)] file:px-3.5 file:py-2.5 file:text-sm file:text-[var(--color-neutral-800)]" />
          <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
            PNG, JPG, or SVG, under 1MB — optional, we&apos;ll fetch one automatically if you skip
            this.
          </p>
        </div>

        <div>
          <label className="fl">One-line tagline</label>
          <input name="tagline" placeholder="What do you do, in one sentence?" />
        </div>

        <div className="border-t pt-5" style={{ borderColor: "var(--color-divider)" }}>
          <div className="sec-lbl mb-3">Hiring</div>
          <label className="flex cursor-pointer items-center gap-2.5 text-[13.5px]" style={{ color: "var(--color-neutral-800)" }}>
            <input type="checkbox" name="hiring" className="!w-auto accent-[var(--color-accent-500)]" />
            Currently hiring
          </label>
          <div className="mt-3.5">
            <label className="fl">Jobs page URL</label>
            <input name="jobsUrl" type="url" placeholder="https://" />
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t pt-5" style={{ borderColor: "var(--color-divider)" }}>
          <div className="sec-lbl">About you</div>
          <div>
            <label className="fl">
              Your email <span className="req">*</span>
            </label>
            <input name="email" type="email" required placeholder="you@company.com" />
            <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
              Private. Only used if our reviewer has a question.
            </p>
          </div>
        </div>

        {error && (
          <p className="rounded-sm border px-3.5 py-2.5 text-sm" style={{ borderColor: "#b3543f", color: "#b3543f" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={status === "submitting"} className="cf-primary">
          {status === "submitting" ? "Submitting…" : "Submit"}
        </button>
      </div>
    </form>
  );
}

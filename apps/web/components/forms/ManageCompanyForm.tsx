"use client";

import { useState } from "react";

// One row of the "Open roles" section below. Kept in React state (rather
// than plain form inputs) because a role is a repeatable group with a
// conditional walk-in sub-form, and the whole set ships as one JSON field
// — see /api/submit's `roles`.
type RoleDraft = {
  title: string;
  applyUrl: string;
  isWalkin: boolean;
  venue: string;
  walkinAt: string;
};

const EMPTY_ROLE: RoleDraft = { title: "", applyUrl: "", isWalkin: false, venue: "", walkinAt: "" };
const MAX_ROLES = 10;

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
  const [roles, setRoles] = useState<RoleDraft[]>([]);

  function updateRole(index: number, patch: Partial<RoleDraft>) {
    setRoles((prev) => prev.map((role, i) => (i === index ? { ...role, ...patch } : role)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    if (form.get("website_url")) {
      setStatus("done");
      return;
    }

    // Only roles with a title are worth sending; a walk-in keeps its venue
    // and date, everything else drops them so a toggled-then-untoggled row
    // can't smuggle a stale venue through.
    const filledRoles = roles
      .filter((role) => role.title.trim())
      .map((role) => ({
        title: role.title.trim(),
        applyUrl: role.applyUrl.trim(),
        isWalkin: role.isWalkin,
        venue: role.isWalkin ? role.venue.trim() : "",
        walkinAt: role.isWalkin ? role.walkinAt : "",
      }));
    if (filledRoles.length > 0) {
      form.set("roles", JSON.stringify(filledRoles));
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
          <div>
            <div className="sec-lbl">Open roles</div>
            <p className="mt-1.5 text-[11.5px]" style={{ color: "var(--color-neutral-500)" }}>
              Add individual openings, including walk-in interview drives. Optional — we also pick roles up
              automatically from supported job boards.
            </p>
          </div>

          {roles.map((role, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-sm border px-3.5 py-3.5"
              style={{ borderColor: "var(--color-divider)", background: "var(--color-neutral-100)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11.5px] font-medium" style={{ color: "var(--color-neutral-600)" }}>
                  Role {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setRoles((prev) => prev.filter((_, i) => i !== index))}
                  className="text-[11.5px] underline"
                  style={{ color: "var(--color-neutral-600)" }}
                >
                  Remove
                </button>
              </div>

              <div>
                <label className="fl">Role title</label>
                <input
                  value={role.title}
                  onChange={(e) => updateRole(index, { title: e.target.value })}
                  placeholder="e.g. Backend Engineer"
                />
              </div>

              <div>
                <label className="fl">Apply link</label>
                <input
                  type="url"
                  value={role.applyUrl}
                  onChange={(e) => updateRole(index, { applyUrl: e.target.value })}
                  placeholder="https://"
                />
              </div>

              <label
                className="flex cursor-pointer items-center gap-2.5 text-[13.5px]"
                style={{ color: "var(--color-neutral-800)" }}
              >
                <input
                  type="checkbox"
                  checked={role.isWalkin}
                  onChange={(e) => updateRole(index, { isWalkin: e.target.checked })}
                  className="!w-auto accent-[var(--color-accent-500)]"
                />
                This is a walk-in interview
              </label>

              {role.isWalkin && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="fl">Venue</label>
                    <input
                      value={role.venue}
                      onChange={(e) => updateRole(index, { venue: e.target.value })}
                      placeholder="Office address candidates should come to"
                    />
                  </div>
                  <div>
                    <label className="fl">Walk-in date &amp; time</label>
                    <input
                      type="datetime-local"
                      value={role.walkinAt}
                      onChange={(e) => updateRole(index, { walkinAt: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}

          {roles.length < MAX_ROLES && (
            <button
              type="button"
              onClick={() => setRoles((prev) => [...prev, { ...EMPTY_ROLE }])}
              className="self-start rounded-sm border px-3.5 py-2 text-[13px]"
              style={{ borderColor: "var(--color-divider)", color: "var(--color-neutral-800)" }}
            >
              + Add {roles.length === 0 ? "a role" : "another role"}
            </button>
          )}
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

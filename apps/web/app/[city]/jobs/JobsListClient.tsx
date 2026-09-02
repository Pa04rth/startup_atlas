"use client";

import { useMemo, useState } from "react";
import { JOB_TRACKS } from "@startup-atlas/config";
import type { JobPosting } from "@startup-atlas/db";
import { JobCard } from "@/components/JobCard";

const chipBase = "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition";
const chipInactive = "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50";
const chipActive = "border-emerald-600 bg-emerald-600 text-white";

export function JobsListClient({
  jobs,
  cityId,
  cityName,
}: {
  jobs: JobPosting[];
  cityId: string;
  cityName: string;
}) {
  const [search, setSearch] = useState("");
  const [track, setTrack] = useState("");
  const [walkinOnly, setWalkinOnly] = useState(false);

  const tracksPresent = useMemo(
    () => JOB_TRACKS.filter((t) => jobs.some((j) => j.track === t)),
    [jobs],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      if (track && j.track !== track) return false;
      if (walkinOnly && !j.isWalkin) return false;
      if (q) {
        const haystack = `${j.title ?? ""} ${j.brandName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, search, track, walkinOnly]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <a
        href={`/${cityId}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-600 shadow-sm transition hover:bg-neutral-50 hover:text-neutral-900"
      >
        ← Back to map
      </a>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{cityName} jobs &amp; walk-ins</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {jobs.length} open role{jobs.length === 1 ? "" : "s"} right now.
          </p>
        </div>
      </div>

      {jobs.length > 0 && (
        <div className="sticky top-4 z-10 mt-6 space-y-3 rounded-2xl border border-neutral-200 bg-white/95 p-3 shadow-sm backdrop-blur">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles or companies…"
            className="w-full rounded-full border border-neutral-300 px-4 py-2 text-sm transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setTrack("")}
              className={`${chipBase} ${track === "" ? chipActive : chipInactive}`}
            >
              All fields
            </button>
            {tracksPresent.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTrack(track === t ? "" : t)}
                className={`${chipBase} ${track === t ? chipActive : chipInactive}`}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setWalkinOnly((v) => !v)}
              className={`${chipBase} ${walkinOnly ? "border-amber-500 bg-amber-500 text-white" : chipInactive}`}
            >
              Walk-ins only
            </button>
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500">No open roles yet — check back soon.</p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-neutral-500">No roles match these filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} citySlug={cityId} />
          ))}
        </div>
      )}
    </main>
  );
}

"use client";

import { JOB_TRACKS, JOB_SENIORITIES } from "@startup-atlas/config";
import type { CitySnapshot } from "@/lib/snapshot";

export type HiringFilters = { track: string; seniority: string };

const chipBase =
  "whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition";
const chipInactive = "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300";
const chipActive = "border-emerald-600 bg-emerald-600 text-white";

function ChipRow({
  label,
  options,
  counts,
  selected,
  onSelect,
}: {
  label: string;
  options: readonly string[];
  counts: Map<string, number>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  const present = options.filter((o) => (counts.get(o) ?? 0) > 0);
  if (present.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </span>
      {present.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onSelect(selected === option ? "" : option)}
          className={`${chipBase} ${selected === option ? chipActive : chipInactive}`}
        >
          {option} {counts.get(option)}
        </button>
      ))}
    </div>
  );
}

export function HiringBar({
  city,
  jobFacets,
  jobsCount,
  matchCount,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  onClose,
}: {
  city: CitySnapshot["city"];
  jobFacets: CitySnapshot["jobFacets"];
  jobsCount: number;
  matchCount: number;
  filters: HiringFilters;
  onFiltersChange: (next: HiringFilters) => void;
  view: "map" | "grid";
  onViewChange: (view: "map" | "grid") => void;
  onClose: () => void;
}) {
  const trackCounts = new Map(jobFacets.tracks.map((t) => [t.name, t.count]));
  const seniorityCounts = new Map(jobFacets.seniorities.map((s) => [s.name, s.count]));

  return (
    // Two stacked pieces, not one boxy panel: the top row keeps TopBar's
    // exact pill treatment (rounded-full at lg, rounded-2xl below) so
    // switching into hiring mode reads as the same bar changing modes
    // rather than a different widget appearing, and the Field/Level chips
    // sit in their own card underneath — they need multiple rows, which a
    // pill can't hold without turning into an oval blob.
    <div className="flex flex-col items-stretch gap-2 lg:items-start">
      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-lg lg:w-fit lg:flex-row lg:flex-wrap lg:items-center lg:rounded-full lg:px-3 lg:py-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="flex items-center gap-1.5 whitespace-nowrap px-1 text-sm font-semibold text-neutral-900">
            💼 Hiring in {city.name}
          </span>
          <span className="whitespace-nowrap text-xs text-neutral-500">
            {jobsCount} open role{jobsCount === 1 ? "" : "s"} · {matchCount} compan{matchCount === 1 ? "y" : "ies"}{" "}
            hiring
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/${city.id}/jobs`}
            className="whitespace-nowrap rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600 transition hover:bg-orange-100"
          >
            Full jobs list →
          </a>

          <div className="flex overflow-hidden rounded-full border border-neutral-300 text-sm">
            <button
              onClick={() => onViewChange("map")}
              className={"px-3 py-1.5 " + (view === "map" ? "bg-neutral-900 text-white" : "bg-white text-neutral-700")}
            >
              Map
            </button>
            <button
              onClick={() => onViewChange("grid")}
              className={"px-3 py-1.5 " + (view === "grid" ? "bg-neutral-900 text-white" : "bg-white text-neutral-700")}
            >
              Grid
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit hiring view"
            className="rounded-full border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-500 transition hover:bg-neutral-50 hover:text-neutral-800"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 shadow-lg lg:w-fit">
        <ChipRow
          label="Field"
          options={JOB_TRACKS}
          counts={trackCounts}
          selected={filters.track}
          onSelect={(track) => onFiltersChange({ ...filters, track })}
        />
        <ChipRow
          label="Level"
          options={JOB_SENIORITIES}
          counts={seniorityCounts}
          selected={filters.seniority}
          onSelect={(seniority) => onFiltersChange({ ...filters, seniority })}
        />
      </div>
    </div>
  );
}

"use client";

import { SECTORS, STAGES } from "@startup-atlas/config";
import type { CitySnapshot } from "@/lib/snapshot";

export type Filters = {
  search: string;
  kind: string;
  area: string;
  stage: string;
  sector: string;
};

const selectClass =
  "shrink-0 rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function TopBar({
  city,
  facets,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  jobsCount,
  onHiringClick,
}: {
  city: CitySnapshot["city"];
  facets: CitySnapshot["facets"];
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  view: "map" | "grid";
  onViewChange: (view: "map" | "grid") => void;
  jobsCount: number;
  onHiringClick: () => void;
}) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    // rounded-2xl (stacked rows) until there's genuinely enough width for
    // one line — lg (1024px), not sm (640px): at tablet widths a single
    // row still doesn't fit the label + search + 4 selects + toggle + jobs
    // + submit, which cut the last dropdown off past the container edge.
    // Below lg, rounded-full would also wrap onto 3-4 rows and render as a
    // broken oval blob instead of a clean toolbar, since the 9999px radius
    // is computed against the whole (tall, wrapped) box.
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-lg lg:flex-row lg:flex-wrap lg:items-center lg:rounded-full lg:px-3 lg:py-2">
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap px-1 text-sm font-semibold text-neutral-900">
          📍 {city.name} Startup Map
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          placeholder="Search startups, sectors, founders…"
          className="min-w-0 flex-1 rounded-full border border-neutral-300 px-4 py-1.5 text-sm transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600 lg:min-w-[180px]"
        />
      </div>

      {/* Wraps onto as many rows as it needs below lg (rather than hiding
          "All sectors" etc. behind a horizontal scroll a visitor has no
          reason to expect is there) — flows onto one line once the bar has
          room for it (lg+). */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filters.kind} onChange={(e) => set("kind", e.target.value)} className={selectClass}>
          <option value="">All types</option>
          {facets.kinds.map((k) => (
            <option key={k} value={k}>
              {k === "vc" ? "VC" : k === "mnc" ? "MNC" : "Startup"}
            </option>
          ))}
        </select>

        <select value={filters.area} onChange={(e) => set("area", e.target.value)} className={selectClass}>
          <option value="">All areas</option>
          {facets.areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        {/* Fixed taxonomy (packages/config), not derived from brand data yet —
            brands aren't classified against these values until asked, so
            picking one may show few/no results for now. */}
        <select value={filters.stage} onChange={(e) => set("stage", e.target.value)} className={selectClass}>
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select value={filters.sector} onChange={(e) => set("sector", e.target.value)} className={selectClass}>
          <option value="">All sectors</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex shrink-0 overflow-hidden rounded-full border border-neutral-300 text-sm">
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
          onClick={onHiringClick}
          className="whitespace-nowrap rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 transition hover:bg-orange-100"
        >
          💼 {jobsCount} jobs
        </button>

        <a
          href="/submit"
          className="ml-auto whitespace-nowrap rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-600 lg:ml-0"
        >
          Submit
        </a>
      </div>
    </div>
  );
}

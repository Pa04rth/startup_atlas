"use client";

import Link from "next/link";
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
  "rounded-full border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-700 transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function TopBar({
  city,
  facets,
  filters,
  onFiltersChange,
  view,
  onViewChange,
  jobsCount,
}: {
  city: CitySnapshot["city"];
  facets: CitySnapshot["facets"];
  filters: Filters;
  onFiltersChange: (next: Filters) => void;
  view: "map" | "grid";
  onViewChange: (view: "map" | "grid") => void;
  jobsCount: number;
}) {
  function set<K extends keyof Filters>(key: K, value: Filters[K]) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 shadow-lg">
      <span className="flex items-center gap-1.5 whitespace-nowrap px-1 text-sm font-semibold text-neutral-900">
        📍 {city.name} Startup Map
      </span>

      <input
        type="text"
        value={filters.search}
        onChange={(e) => set("search", e.target.value)}
        placeholder="Search startups, sectors, founders…"
        className="min-w-[180px] flex-1 rounded-full border border-neutral-300 px-4 py-1.5 text-sm transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      />

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

      <Link
        href={`/${city.id}/jobs`}
        className="whitespace-nowrap rounded-full border border-orange-300 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-600 transition hover:bg-orange-100"
      >
        💼 {jobsCount} jobs
      </Link>

      <Link
        href="/submit"
        className="whitespace-nowrap rounded-full bg-orange-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        Submit
      </Link>
    </div>
  );
}

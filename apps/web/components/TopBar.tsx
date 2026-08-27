"use client";

import Link from "next/link";
import type { CitySnapshot } from "@/lib/snapshot";

export type Filters = {
  search: string;
  kind: string;
  area: string;
  stage: string;
  sector: string;
};

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
    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-white px-4 py-3 shadow-sm">
      <span className="flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-neutral-900">
        📍 {city.name} Startup Map
      </span>

      <input
        type="text"
        value={filters.search}
        onChange={(e) => set("search", e.target.value)}
        placeholder="Search startups, sectors, founders…"
        className="min-w-[200px] flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm transition focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
      />

      <select
        value={filters.kind}
        onChange={(e) => set("kind", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All types</option>
        {facets.kinds.map((k) => (
          <option key={k} value={k}>
            {k === "vc" ? "VC" : "Startup"}
          </option>
        ))}
      </select>

      <select
        value={filters.area}
        onChange={(e) => set("area", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All areas</option>
        {facets.areas.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select
        value={filters.stage}
        onChange={(e) => set("stage", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All stages</option>
        {facets.stages.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.sector}
        onChange={(e) => set("sector", e.target.value)}
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
      >
        <option value="">All sectors</option>
        {facets.sectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <div className="flex overflow-hidden rounded-md border border-neutral-300 text-sm">
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
        className="whitespace-nowrap rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        💼 {jobsCount} jobs
      </Link>

      <Link
        href="/submit"
        className="whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Submit
      </Link>
    </div>
  );
}

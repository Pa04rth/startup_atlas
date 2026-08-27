"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CitySnapshot } from "@/lib/snapshot";
import { TopBar, type Filters } from "./TopBar";
import { MapView } from "./MapView";
import { PrecisionBadge } from "./PrecisionBadge";
import { CompanyLogo } from "./CompanyLogo";

const EMPTY_FILTERS: Filters = { search: "", kind: "", area: "", stage: "", sector: "" };

export function CityExplorer({ snapshot, jobsCount }: { snapshot: CitySnapshot; jobsCount: number }) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<"map" | "grid">("map");

  const filtered = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return snapshot.brands.filter((b) => {
      if (filters.kind && b.kind !== filters.kind) return false;
      if (filters.area && b.area !== filters.area) return false;
      if (filters.stage && b.stage !== filters.stage) return false;
      if (filters.sector && b.sector !== filters.sector) return false;
      if (search) {
        const haystack = `${b.name} ${b.sector ?? ""} ${b.tagline ?? ""}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [snapshot.brands, filters]);

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        city={snapshot.city}
        facets={snapshot.facets}
        filters={filters}
        onFiltersChange={setFilters}
        view={view}
        onViewChange={setView}
        jobsCount={jobsCount}
      />

      <div className="min-h-0 flex-1">
        {view === "map" ? (
          <MapView city={snapshot.city} brands={filtered} />
        ) : (
          <div className="h-full overflow-y-auto bg-neutral-50 p-4">
            {filtered.length === 0 ? (
              <p className="mt-12 text-center text-sm text-neutral-500">No startups match these filters.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((b) => (
                  <Link
                    key={b.id}
                    href={`/${snapshot.city.id}/company/${b.slug}`}
                    className="rounded-lg border border-neutral-200 bg-white p-4 transition hover:border-neutral-400 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <CompanyLogo src={b.logoUrl} name={b.name} className="h-6 w-6 shrink-0 rounded" />
                        <h3 className="truncate font-medium text-neutral-900">{b.name}</h3>
                      </div>
                      {b.hiring && (
                        <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Hiring
                        </span>
                      )}
                    </div>
                    {b.tagline && <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{b.tagline}</p>}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {b.sector && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {b.sector}
                        </span>
                      )}
                      {b.stage && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                          {b.stage}
                        </span>
                      )}
                      <PrecisionBadge precision={b.precision} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

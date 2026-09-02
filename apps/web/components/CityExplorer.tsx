"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { CitySnapshot } from "@/lib/snapshot";
import { TopBar, type Filters } from "./TopBar";
import { HiringBar, type HiringFilters } from "./HiringBar";
import { MapView } from "./MapView";
import { PrecisionBadge } from "./PrecisionBadge";
import { CompanyLogo } from "./CompanyLogo";
import { FloatingAdPanel } from "./FloatingAdPanel";
import { FloatingNewsPanel } from "./FloatingNewsPanel";
import { DeveloperCredit } from "./DeveloperCredit";

const EMPTY_FILTERS: Filters = { search: "", kind: "", area: "", stage: "", sector: "" };
const EMPTY_HIRING_FILTERS: HiringFilters = { track: "", seniority: "" };

export function CityExplorer({
  snapshot,
  jobsCount,
  sponsorBar,
  leftAdSlot,
  rightAdSlot,
  newsPanel,
}: {
  snapshot: CitySnapshot;
  jobsCount: number;
  // Rendered server-side (SponsorBar/AdSlotStack/GeneralNewsList all hit
  // the DB) and handed down as already-resolved nodes — a client component
  // can't await them itself, but React lets a server component render fine
  // as a child slot passed in from its (server) parent page.
  sponsorBar?: ReactNode;
  leftAdSlot?: ReactNode;
  rightAdSlot?: ReactNode;
  newsPanel?: ReactNode;
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [view, setView] = useState<"map" | "grid">("map");
  const [hiringMode, setHiringMode] = useState(false);
  const [hiringFilters, setHiringFilters] = useState<HiringFilters>(EMPTY_HIRING_FILTERS);

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
      if (hiringMode) {
        if (b.openJobsCount === 0) return false;
        if (hiringFilters.track && !b.hiringTracks.includes(hiringFilters.track)) return false;
        if (hiringFilters.seniority && !b.hiringSeniorities.includes(hiringFilters.seniority)) return false;
      }
      return true;
    });
  }, [snapshot.brands, filters, hiringMode, hiringFilters]);

  return (
    <div className="flex h-screen flex-col">
      {sponsorBar}
      <div className="relative min-h-0 flex-1">
        {/* Floats over the map/grid rather than pushing it down — the
            NavigationControl offset in globals.css keeps MapLibre's own
            top-right zoom control from landing underneath it. */}
        <div className="absolute inset-x-4 top-4 z-30">
          {hiringMode ? (
            <HiringBar
              city={snapshot.city}
              jobFacets={snapshot.jobFacets}
              jobsCount={jobsCount}
              matchCount={filtered.length}
              filters={hiringFilters}
              onFiltersChange={setHiringFilters}
              view={view}
              onViewChange={setView}
              onClose={() => {
                setHiringMode(false);
                setHiringFilters(EMPTY_HIRING_FILTERS);
              }}
            />
          ) : (
            <TopBar
              city={snapshot.city}
              facets={snapshot.facets}
              filters={filters}
              onFiltersChange={setFilters}
              view={view}
              onViewChange={setView}
              jobsCount={jobsCount}
              onHiringClick={() => setHiringMode(true)}
            />
          )}
        </div>

        {newsPanel && (
          <FloatingNewsPanel topClassName={hiringMode ? "top-48" : "top-20"}>{newsPanel}</FloatingNewsPanel>
        )}

        {view === "map" ? (
          <>
            <MapView city={snapshot.city} brands={filtered} focusArea={filters.area} />
            {leftAdSlot && <FloatingAdPanel side="left">{leftAdSlot}</FloatingAdPanel>}
            {rightAdSlot && <FloatingAdPanel side="right">{rightAdSlot}</FloatingAdPanel>}
          </>
        ) : (
          <div className="h-full overflow-y-auto bg-neutral-50 p-4 pt-20">
            {filtered.length === 0 ? (
              <p className="mt-12 text-center text-sm text-neutral-500">No startups match these filters.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((b) => (
                  <a
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
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        🚀 {snapshot.brands.length} startup{snapshot.brands.length === 1 ? "" : "s"}
        {/* Dropped on mobile — with the developer-credit badge sharing this
            row from the opposite corner, the full sentence doesn't fit
            beside it under ~400px wide. */}
        <span className="hidden sm:inline">
          {" "}
          active in {snapshot.city.name}
        </span>
      </div>

      <div className="fixed bottom-5 left-5 z-40 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 shadow-lg sm:flex">
        <DeveloperCredit />
      </div>
    </div>
  );
}

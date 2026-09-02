"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { CitySnapshot } from "@/lib/snapshot";
import { TopBar, type Filters } from "./TopBar";
import { HiringBar, type HiringFilters } from "./HiringBar";
import { MapView } from "./MapView";
import { PrecisionBadge } from "./PrecisionBadge";
import { CompanyLogo } from "./CompanyLogo";
import { FloatingAdPanel } from "./FloatingAdPanel";
import { NewsTab } from "./NewsTab";
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
  const [newsExpanded, setNewsExpanded] = useState(false);

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
            top-right zoom control from landing underneath it.
            The bar, NewsTab, and the boost ad card below it are real flex
            siblings in one column (not independently-absolute-positioned
            guesses at each other's height) — TopBar is 1 row on a wide
            screen but stacks to 3 on a narrower one, HiringBar's chip rows
            wrap depending on how many are present, and NewsTab starts
            collapsed into a small flag tab that can expand — so there's no
            fixed pixel offset that stays correct for what's underneath any
            of them. Flow layout means each one always starts exactly where
            the thing above it actually ends, at every width and in every
            state. */}
        <div className="absolute inset-x-4 top-4 z-30 flex flex-col items-start gap-3">
          {/* Full width below lg so the stacked mobile/tablet rows use the
              available screen width properly; fit-content at lg+ so the
              single-line pill shrink-wraps to its own content instead of
              stretching to the full ~1900px container — which, with an
              opaque white background, was rendering as a big dead
              clickable-looking blank strip to the right of Submit that hid
              the map underneath it for no reason. */}
          <div className="w-full lg:w-fit">
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

          <NewsTab newsPanel={newsPanel} expanded={newsExpanded} onExpandedChange={setNewsExpanded} />

          {/* Hidden (not pushed down) while news is expanded — letting flex
              flow shove it further down the page every time news opened ran
              it into the map's zoom control above and the dev-credit badge
              below. It reappears in its normal spot once news is minimized. */}
          {view === "map" && leftAdSlot && !newsExpanded && (
            <FloatingAdPanel side="left">{leftAdSlot}</FloatingAdPanel>
          )}
        </div>

        {view === "map" ? (
          <>
            <MapView city={snapshot.city} brands={filtered} focusArea={filters.area} />
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

      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-neutral-900 px-3 py-2 text-xs font-medium text-white shadow-lg sm:px-4 sm:py-2.5 sm:text-sm">
        🚀 {snapshot.brands.length} startup{snapshot.brands.length === 1 ? "" : "s"}
        {/* Dropped on mobile — with the developer-credit badge sharing this
            row from the opposite corner, the full sentence doesn't fit
            beside it under ~400px wide. */}
        <span className="hidden sm:inline">
          {" "}
          active in {snapshot.city.name}
        </span>
      </div>

      {/* Two variants, toggled by breakpoint (not JS) — compact (no avatar,
          just the two names) below sm where it shares this corner's row
          with the startup-count badge above, full version once there's
          room for it. */}
      <div className="fixed bottom-5 left-5 z-40 flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-500 shadow-lg sm:hidden">
        <DeveloperCredit compact />
      </div>
      <div className="fixed bottom-5 left-5 z-40 hidden items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-500 shadow-lg sm:flex">
        <DeveloperCredit />
      </div>
    </div>
  );
}

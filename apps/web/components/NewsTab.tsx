"use client";

import type { ReactNode } from "react";

// News, behind one collapsible flag tab (matching the reference product's
// collapsed-survey-tab pattern) — starts collapsed so its footprint is tiny
// and constant at every screen size, and expansion is a deliberate click,
// so however tall the expanded card ends up doesn't need to be pre-computed
// against anything else on screen. Flush against the left edge (negative
// margin pulling it out of CityExplorer's inset-x-4 wrapper, rounded only
// on the right) rather than floating with a gap on both sides — this is a
// docked tab, not a floating card.
//
// `expanded` is controlled by CityExplorer (not local state) — it also
// hides the boost ad card while this is open, rather than letting flex flow
// push it further down the page every time news expands, which ran it into
// the map's zoom control above and the dev-credit badge below.
export function NewsTab({
  newsPanel,
  expanded,
  onExpandedChange,
}: {
  newsPanel?: ReactNode;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  if (!newsPanel) return null;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => onExpandedChange(true)}
        aria-label="Show latest news"
        className="-ml-4 flex items-center gap-1.5 rounded-r-xl border border-l-0 border-neutral-200 bg-white px-2 py-3 text-xs font-semibold text-neutral-700 shadow-lg transition [writing-mode:vertical-rl] hover:bg-neutral-50"
      >
        <span>Latest news</span>
      </button>
    );
  }

  return (
    <div className="-ml-4 flex max-h-[70vh] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-r-xl border border-l-0 border-neutral-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="text-[15px] font-bold text-neutral-900">Latest news</h2>
        <button
          onClick={() => onExpandedChange(false)}
          aria-label="Minimize news panel"
          className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          ✕
        </button>
      </div>
      <div className="thin-scrollbar overflow-y-auto p-4">{newsPanel}</div>
    </div>
  );
}

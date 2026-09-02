"use client";

import { useState, type ReactNode } from "react";

// Card only — no positioning of its own. CityExplorer stacks this in a flex
// column on the left, directly above the boost AdSlotStack (FloatingAdPanel
// side="left"), so the two can never overlap regardless of how much news
// there is. Dismissible so it never permanently blocks the map underneath.
export function FloatingNewsPanel({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="w-80 shrink-0 rounded-xl border border-neutral-200 bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h2 className="text-[15px] font-bold text-neutral-900">Latest news</h2>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss news panel"
          className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          ✕
        </button>
      </div>
      {/* Capped + scrollable — GeneralNewsList can render a dozen-plus
          articles, and an unbounded height here would push the ad card
          stacked below it off the bottom of the viewport. */}
      <div className="max-h-[40vh] overflow-y-auto p-4">{children}</div>
    </div>
  );
}

"use client";

import { useState, type ReactNode } from "react";

// Upper-left, below the floating TopBar — bottom-left is the developer
// credit badge, bottom-right is the startup-count badge, so this is what's
// left. Dismissible so it never permanently blocks the map underneath it.
export function FloatingNewsPanel({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="absolute left-4 top-20 z-30 hidden w-80 sm:block">
      <div className="rounded-xl border border-neutral-200 bg-white shadow-lg">
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
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

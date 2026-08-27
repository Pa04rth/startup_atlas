"use client";

import { useState, type ReactNode } from "react";

// Upper-left, below the floating TopBar — bottom-left is the developer
// credit badge, bottom-right is the startup-count badge, so this is what's
// left. Dismissible so it never permanently blocks the map underneath it.
export function FloatingNewsPanel({ children }: { children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="absolute left-4 top-20 z-30 hidden w-64 sm:block">
      {/* The dismiss button lives outside the overflow-y-auto element below
          — a negative-offset absolute child of a scrolling container gets
          clipped by that container's own overflow, which is what made it
          invisible. */}
      <div className="relative rounded-lg border border-neutral-200 bg-white/95 shadow-lg backdrop-blur-sm">
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss news panel"
          className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs leading-none text-neutral-500 shadow-sm transition hover:text-neutral-900"
        >
          ✕
        </button>
        <div className="max-h-64 overflow-y-auto p-3">
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            📰 Startup &amp; tech news
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}

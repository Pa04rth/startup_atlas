"use client";

import { useState, type ReactNode } from "react";

// Wraps a full-width bar (like SponsorBar) with a dismiss cross button,
// mirroring the ✕ on the floating ad/news panels — local, non-persisted
// state, so it reappears on a fresh page load.
export function DismissibleBar({ children, label }: { children: ReactNode; label: string }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="relative">
      {children}
      <button
        onClick={() => setDismissed(true)}
        aria-label={label}
        className="absolute right-2 top-1/2 z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs leading-none text-neutral-500 shadow-sm transition hover:text-neutral-900"
      >
        ✕
      </button>
    </div>
  );
}

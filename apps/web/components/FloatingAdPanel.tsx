"use client";

import { useState, type ReactNode } from "react";

// Docked ad slot over the map (left/right edge, like the reference site's
// floating promo cards) — dismissible per side so it never permanently
// blocks the map underneath it. State is local to this mount, not
// persisted: reappears on a fresh page load, which is fine for a slot
// whose whole point is to be seen.
//
// The right slot self-positions (vertically centered, nothing else lives on
// that edge). The left slot shares its edge with NewsTab, so it doesn't
// position itself at all — CityExplorer places it as NewsTab's flex sibling
// (real document flow, not a guessed offset), directly below whatever
// height NewsTab currently is (its collapsed tab most of the time, its
// expanded card when a visitor opens it) so the two can never overlap.
export function FloatingAdPanel({ side, children }: { side: "left" | "right"; children: ReactNode }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const card = (
    <div className="relative rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-md backdrop-blur-sm">
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss ad"
        className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-xs leading-none text-neutral-500 shadow-sm transition hover:text-neutral-900"
      >
        ✕
      </button>
      {children}
    </div>
  );

  if (side === "left") {
    return <div className="hidden w-44 shrink-0 lg:block">{card}</div>;
  }

  return (
    <div className="absolute right-4 top-1/2 z-30 hidden w-44 -translate-y-1/2 lg:block">{card}</div>
  );
}

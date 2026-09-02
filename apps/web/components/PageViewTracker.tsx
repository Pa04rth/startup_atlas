"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

// Mounted once in the root layout — fires a first-party pageview beacon on
// every path (including the very first load). Deliberately dumb: no
// client id, no cookie, just "this path was viewed" — see CLAUDE.md §10.
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track(pathname);
  }, [pathname]);

  return null;
}

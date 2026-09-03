import { Cormorant_Garamond, Lora } from "next/font/google";
import type { ReactNode } from "react";
import "./classical-landing.css";

// Scoped to the pages that opt into it (via .variable on the wrapper, not
// the root <html>/<body>) — the rest of the app stays on Inter and
// Tailwind's neutral-emerald palette. --font-heading/--font-body are the
// exact token names the design (Claude Design canvas, option 1c) was
// authored against.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-heading",
});
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-body",
});

export function ClassicalShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`${cormorant.variable} ${lora.variable} classical-theme ${className}`}
      style={{ fontFamily: "var(--font-body)" }}
    >
      {children}
    </div>
  );
}

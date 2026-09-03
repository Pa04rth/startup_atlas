import type { ReactNode } from "react";

// The plain top bar every classical-themed form/profile page opens with —
// wordmark on the left, a page-specific slot (tagline, or a "Manage
// company" link) on the right, hidden on mobile since there's no room for
// both without crowding the wordmark.
export function FormPageHeader({ right }: { right?: ReactNode }) {
  return (
    <div
      className="flex items-baseline justify-between border-b px-5 py-4 sm:px-8 sm:py-[22px]"
      style={{ borderColor: "var(--color-divider)" }}
    >
      <a href="/" className="whitespace-nowrap text-lg text-inherit no-underline sm:text-[22px]" style={{ fontFamily: "var(--font-heading)" }}>
        Startup Atlas.
      </a>
      {right && <div className="hidden sm:block">{right}</div>}
    </div>
  );
}

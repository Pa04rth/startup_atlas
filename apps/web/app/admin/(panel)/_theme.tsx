// Shared theme for the admin panel — the same "classical" language the
// public site runs on (Cormorant Garamond headings, Lora body, cream ground,
// gold accent; see components/landing/classical-landing.css), so the admin
// reads as the same product rather than a separate tool.
//
// Values are inlined as Tailwind arbitrary hex rather than pulled from the
// public site's CSS custom properties on purpose: the admin deliberately
// does NOT mount `.classical-theme`, because that stylesheet's component
// layer restyles every bare input/select/textarea (width:100%, form
// padding) which would break the admin's inline search boxes and
// checkboxes. Same palette, kept independent.

// Ground, surfaces, and ink.
export const ink = {
  surface: "#f8f4f4", // card/chart surface (neutral-100)
  plane: "#f3f2f2", // page background (color-bg)
  primary: "#201f1d", // color-text
  secondary: "#605d5d", // neutral-700
  muted: "#7d7979", // neutral-600
  grid: "#e2dfdc",
  axis: "#cbc7c3",
  border: "rgba(32,31,29,0.16)", // color-divider
} as const;

// Categorical chart slots, darkened from the dark-theme pair so they hold
// contrast against a cream surface instead of glowing on it.
export const series = {
  a: "#2d6cb5", // blue — "found" / primary series
  b: "#b8501f", // burnt orange — "upserted" / secondary series
} as const;

// Fixed status palette (never themed, never reused as a categorical
// color). Retuned for a light ground: these are the *text* colors, each
// carrying its own low-opacity fill and border below.
export const status = {
  good: "#157a15", // published, approved, released
  info: "#2d6cb5", // probable, paid — "in progress, not alarming"
  warning: "#8a5d0a", // review, pending, fulfilled (awaiting payout)
  critical: "#b3402c", // archived-as-rejected, refused, refunded
} as const;

export type StatusRole = keyof typeof status;

// One place mapping every status string this app actually uses to a role
// — keeps every admin page's badges consistent instead of six separate
// ad-hoc color maps.
const STATUS_ROLE: Record<string, StatusRole> = {
  published: "good",
  approved: "good",
  released: "good",
  probable: "info",
  paid: "info",
  requested: "info",
  review: "warning",
  pending: "warning",
  fulfilled: "warning",
  waitlisted: "warning",
  queued: "warning",
  live: "good",
  archived: "critical",
  rejected: "critical",
  refunded: "critical",
  expired: "critical",
};

export function roleFor(statusValue: string): StatusRole {
  return STATUS_ROLE[statusValue] ?? "info";
}

// Badge fill is the status hue at low opacity, text at full strength, so it
// reads as a soft pill rather than a solid alarm block.
export const statusBadgeClass: Record<StatusRole, string> = {
  good: "bg-[#157a15]/10 text-[#157a15] border border-[#157a15]/25",
  info: "bg-[#2d6cb5]/10 text-[#2d6cb5] border border-[#2d6cb5]/25",
  warning: "bg-[#8a5d0a]/10 text-[#8a5d0a] border border-[#8a5d0a]/25",
  critical: "bg-[#b3402c]/10 text-[#b3402c] border border-[#b3402c]/25",
};

export function StatusPill({ value }: { value: string }) {
  const role = roleFor(value);
  return (
    <span className={`rounded-sm px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide ${statusBadgeClass[role]}`}>
      {value}
    </span>
  );
}

// Shared surface/typography classes so every admin page shares one visual
// language instead of drifting.
export const pageClass = "min-h-screen bg-[#f3f2f2] text-[#201f1d]";
export const cardClass = "rounded-md border border-[#201f1d]/12 bg-[#f8f4f4] p-5";
export const headingClass = "font-[family-name:var(--font-heading)]";
export const primaryText = "text-[#201f1d]";
export const secondaryText = "text-[#605d5d]";
export const mutedText = "text-[#7d7979]";
export const linkClass = "text-[#7d5411] hover:underline";

export const tableHeadClass = "border-b border-[#201f1d]/12 text-[#7d7979]";
export const tableRowClass = "border-b border-[#201f1d]/8 last:border-0 hover:bg-[#201f1d]/[0.03]";

export const inputClass =
  "rounded-sm border border-[#201f1d]/16 bg-[#f3f2f2] px-3 py-1.5 text-sm text-[#201f1d] placeholder:text-[#9b9797] focus:border-[#b68235] focus:outline-none focus:ring-2 focus:ring-[#b68235]/25";
export const buttonPrimaryClass =
  "rounded-sm bg-[#2d2b2b] px-3 py-1.5 text-sm font-medium text-[#f8f4f4] transition hover:bg-[#201f1d] disabled:cursor-not-allowed disabled:opacity-50";
export const buttonDangerClass =
  "rounded-sm bg-[#b3402c] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#9c3626] disabled:opacity-50";
export const buttonGhostClass =
  "rounded-sm border border-[#201f1d]/16 px-3 py-1.5 text-sm text-[#605d5d] transition hover:border-[#201f1d]/30 hover:bg-[#201f1d]/[0.03] disabled:opacity-50";

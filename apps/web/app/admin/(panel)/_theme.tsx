// Shared dark theme for the admin panel — the validated default palette
// from the dataviz skill (references/palette.md), used as-is rather than
// invented per-page. Dark-mode-only by design: the admin panel is an
// internal tool, not the public site (which stays light), so there's no
// light/dark toggle to support here — just one deliberate dark theme.

// Chart chrome & ink (skill's dark column)
export const ink = {
  surface: "#1a1a19", // card/chart surface
  plane: "#0d0d0d", // page background
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  border: "rgba(255,255,255,0.10)",
} as const;

// Categorical slots 1 & 2 (blue, orange) — the documented order's first
// adjacent pair, already validated together (worst adjacent CVD ΔE 8.4
// dark, normal-vision ΔE 19.3 dark).
export const series = {
  a: "#3987e5", // blue — "found" / primary series
  b: "#d95926", // orange — "upserted" / secondary series
} as const;

// Fixed status palette (never themed, never reused as a categorical
// color) — all four clear 3:1 on the dark surface.
export const status = {
  good: "#0ca30c", // published, approved, released
  info: "#3987e5", // probable, paid — categorical blue reused as a neutral
  //                   "in progress, not alarming" tag (not one of the 4
  //                   reserved alarm roles, so borrowing the categorical
  //                   hue here is fine per the skill's own status-vs-
  //                   categorical distinction rule).
  warning: "#fab219", // review, pending, fulfilled (awaiting payout)
  critical: "#d03b3b", // archived-as-rejected, refused, refunded
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

// Tailwind arbitrary-value classes per role — badge background is the
// status hex at low opacity, text is the full-strength hex, so it reads
// as a soft pill rather than a solid alarm block.
export const statusBadgeClass: Record<StatusRole, string> = {
  good: "bg-[#0ca30c]/15 text-[#3ddc3d] border border-[#0ca30c]/30",
  info: "bg-[#3987e5]/15 text-[#6ba5ec] border border-[#3987e5]/30",
  warning: "bg-[#fab219]/15 text-[#fcc34d] border border-[#fab219]/30",
  critical: "bg-[#d03b3b]/15 text-[#e46b6b] border border-[#d03b3b]/30",
};

export function StatusPill({ value }: { value: string }) {
  const role = roleFor(value);
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusBadgeClass[role]}`}>
      {value}
    </span>
  );
}

// Shared surface/card classes so every admin page shares one visual
// language instead of drifting.
export const cardClass = "rounded-xl border border-white/10 bg-[#1a1a19] p-5 shadow-sm";
export const pageClass = "min-h-screen bg-[#0d0d0d] text-white";
export const mutedText = "text-[#898781]";
export const secondaryText = "text-[#c3c2b7]";
export const tableHeadClass = "border-b border-white/10 text-[#898781]";
export const tableRowClass = "border-b border-white/5 last:border-0 hover:bg-white/[0.03]";
export const inputClass =
  "rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-[#898781] focus:border-[#3987e5] focus:outline-none focus:ring-2 focus:ring-[#3987e5]/30";
export const buttonPrimaryClass =
  "rounded-lg bg-[#3987e5] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#2a78d6] disabled:cursor-not-allowed disabled:opacity-50";
export const buttonDangerClass =
  "rounded-lg bg-[#d03b3b] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#b93333] disabled:opacity-50";
export const buttonGhostClass =
  "rounded-lg border border-white/15 px-3 py-1.5 text-sm text-[#c3c2b7] transition hover:bg-white/5 disabled:opacity-50";

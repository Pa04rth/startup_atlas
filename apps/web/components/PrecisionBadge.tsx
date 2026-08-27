import type { LocPrecision } from "@startup-atlas/core";

const LABELS: Record<LocPrecision, string> = {
  exact: "Exact location",
  building: "Exact location",
  street: "Street-level",
  locality: "Approximate — locality",
  area: "Approximate — area centroid",
  city: "Approximate — city centroid",
  synthetic: "Approximate — city centroid",
};

const SOLID: LocPrecision[] = ["exact", "building", "street"];

export function PrecisionBadge({ precision }: { precision: LocPrecision | null }) {
  if (!precision) return null;
  const solid = SOLID.includes(precision);

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium " +
        (solid ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")
      }
      title="We label every pin's precision honestly — never a fake exact location."
    >
      <span className={"h-1.5 w-1.5 rounded-full " + (solid ? "bg-emerald-500" : "bg-amber-500")} />
      {LABELS[precision]}
    </span>
  );
}

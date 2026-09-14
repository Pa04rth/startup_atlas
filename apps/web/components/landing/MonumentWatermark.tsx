import type { CityId } from "@startup-atlas/config";

// Large, faded monument line-art sitting behind a form page's hero copy —
// same <symbol> defs as the homepage (MonumentSymbols must be rendered
// once somewhere on the page), just referenced at a bigger size and low
// opacity here instead of full ink-drawn color. Static (no boot/hover
// animation) — these are backdrops, not the page's main character the way
// they are on the homepage diptych.
//
// `meet`, not the design file's `slice`: slice scales the drawing to cover
// the box and crops whatever overflows, which chopped the domes and side
// wings off every monument. meet fits the whole building inside the box
// instead, anchored to the bottom edge so it still reads as sitting on the
// ground behind the content.
export function MonumentWatermark({
  city,
  className = "",
  color = "var(--color-accent-300)",
  opacity = 0.8,
}: {
  city: CityId;
  className?: string;
  color?: string;
  opacity?: number;
}) {
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax meet"
      className={className}
      style={{ color, opacity }}
      aria-hidden="true"
    >
      <use href={`#m-${city}`} />
    </svg>
  );
}

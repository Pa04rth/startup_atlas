"use client";

import { useState } from "react";
import { ink, series } from "../_theme";

// Two-series grouped bars (found vs upserted per ingestion run) — fixed
// categorical order (series.a, series.b), legend always present for >=2
// series, 2px surface gap between adjacent bars, hover tooltip per mark.
export function GroupedBarChart({
  data,
  seriesLabels,
  height = 200,
}: {
  data: Array<{ label: string; a: number; b: number }>;
  seriesLabels: [string, string];
  height?: number;
}) {
  const [hover, setHover] = useState<{ index: number; key: "a" | "b" } | null>(null);
  const width = 560;
  const padding = { top: 12, right: 12, bottom: 36, left: 28 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm" style={{ color: ink.muted }}>No data yet</div>;
  }

  const max = Math.max(...data.flatMap((d) => [d.a, d.b]), 1);
  const groupW = innerW / data.length;
  const barGap = 2; // surface gap between adjacent bars, per mark spec
  const barW = Math.max((groupW - barGap * 3) / 2, 2);

  const yFor = (v: number) => (v / max) * innerH;
  const gridLines = [0, 0.5, 1];

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-xs" style={{ color: ink.secondary }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: series.a }} />
          {seriesLabels[0]}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: series.b }} />
          {seriesLabels[1]}
        </span>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Ingestion runs chart">
          {gridLines.map((t, i) => {
            const gy = padding.top + innerH * (1 - t);
            return (
              <g key={i}>
                <line x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke={ink.grid} strokeWidth={1} />
                <text x={padding.left - 6} y={gy + 3} fontSize={9} fill={ink.muted} textAnchor="end">
                  {Math.round(max * t)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const groupX = padding.left + i * groupW;
            const aH = yFor(d.a);
            const bH = yFor(d.b);
            return (
              <g key={i}>
                <rect
                  x={groupX + barGap}
                  y={padding.top + innerH - aH}
                  width={barW}
                  height={Math.max(aH, aH > 0 ? 2 : 0)}
                  rx={2}
                  fill={series.a}
                  opacity={hover && hover.index === i && hover.key !== "a" ? 0.5 : 1}
                  onMouseEnter={() => setHover({ index: i, key: "a" })}
                  onMouseLeave={() => setHover(null)}
                />
                <rect
                  x={groupX + barGap * 2 + barW}
                  y={padding.top + innerH - bH}
                  width={barW}
                  height={Math.max(bH, bH > 0 ? 2 : 0)}
                  rx={2}
                  fill={series.b}
                  opacity={hover && hover.index === i && hover.key !== "b" ? 0.5 : 1}
                  onMouseEnter={() => setHover({ index: i, key: "b" })}
                  onMouseLeave={() => setHover(null)}
                />
                <text
                  x={groupX + groupW / 2}
                  y={height - padding.bottom + 14}
                  fontSize={9}
                  fill={ink.muted}
                  textAnchor="middle"
                >
                  {d.label.length > 10 ? `${d.label.slice(0, 10)}…` : d.label}
                </text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute rounded-md border px-2 py-1 text-xs shadow-lg"
            style={{
              left: `${((padding.left + hover.index * groupW + groupW / 2) / width) * 100}%`,
              top: 0,
              transform: "translateX(-50%)",
              background: ink.surface,
              borderColor: ink.border,
              color: ink.primary,
            }}
          >
            <div style={{ color: ink.muted }}>{data[hover.index].label}</div>
            <div className="font-semibold">
              {seriesLabels[hover.key === "a" ? 0 : 1]}: {hover.key === "a" ? data[hover.index].a : data[hover.index].b}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

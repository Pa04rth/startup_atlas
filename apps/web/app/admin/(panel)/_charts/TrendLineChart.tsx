"use client";

import { useState } from "react";
import { ink, series } from "../_theme";

// Single-series line + area, per the dataviz skill's mark spec: 2px line,
// 4px rounded data-ends, recessive gridlines, hover crosshair+tooltip.
// One series -> no legend box needed (the chart title already names it).
export function TrendLineChart({
  data,
  height = 160,
  formatValue = (v: number) => String(v),
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  formatValue?: (v: number) => string;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 560;
  const padding = { top: 12, right: 12, bottom: 22, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  if (data.length === 0) {
    return <div className="flex h-40 items-center justify-center text-sm" style={{ color: ink.muted }}>No data yet</div>;
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = 0; // counts always start at zero — never truncate this axis

  const x = (i: number) => padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => padding.top + innerH - ((v - min) / (max - min || 1)) * innerH;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(d.value)}`).join(" ");
  const areaPath = `${linePath} L ${x(data.length - 1)} ${padding.top + innerH} L ${x(0)} ${padding.top + innerH} Z`;

  const gridLines = [0, 0.5, 1].map((t) => padding.top + innerH * t);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseLeave={() => setHoverIndex(null)}
        role="img"
        aria-label="Trend chart"
      >
        {gridLines.map((gy, i) => (
          <line key={i} x1={padding.left} x2={width - padding.right} y1={gy} y2={gy} stroke={ink.grid} strokeWidth={1} />
        ))}
        <path d={areaPath} fill={series.a} fillOpacity={0.12} stroke="none" />
        <path d={linePath} fill="none" stroke={series.a} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((d, i) => (
          <circle
            key={i}
            cx={x(i)}
            cy={y(d.value)}
            r={hoverIndex === i ? 5 : 3}
            fill={series.a}
            stroke={ink.surface}
            strokeWidth={1.5}
            className="transition-all"
          />
        ))}
        {/* wide invisible hit targets — bigger than the visible mark, per the skill's interaction rule */}
        {data.map((d, i) => (
          <rect
            key={`hit-${i}`}
            x={x(i) - innerW / Math.max(data.length, 1) / 2}
            y={padding.top}
            width={innerW / Math.max(data.length, 1)}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}
        <text x={padding.left} y={height - 4} fontSize={10} fill={ink.muted}>
          {data[0]?.label}
        </text>
        <text x={width - padding.right} y={height - 4} fontSize={10} fill={ink.muted} textAnchor="end">
          {data[data.length - 1]?.label}
        </text>
      </svg>
      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute rounded-md border px-2 py-1 text-xs shadow-lg"
          style={{
            left: `${(x(hoverIndex) / width) * 100}%`,
            top: y(data[hoverIndex].value) - 40,
            transform: "translateX(-50%)",
            background: ink.surface,
            borderColor: ink.border,
            color: ink.primary,
          }}
        >
          <div style={{ color: ink.muted }}>{data[hoverIndex].label}</div>
          <div className="font-semibold">{formatValue(data[hoverIndex].value)}</div>
        </div>
      )}
    </div>
  );
}

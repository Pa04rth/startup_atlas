"use client";

import { useMemo, useState } from "react";
import { TrendLineChart } from "./TrendLineChart";
import { buttonGhostClass, mutedText, secondaryText } from "../_theme";

type Day = { day: string; count: number };

// "2026-09-02" -> "2026-09". Sliced off the ISO string rather than parsed
// into a Date on purpose: the day column is already a whole calendar day,
// and running it through a Date would re-interpret it in the viewer's
// timezone and slide the last day of a month into the next one.
function monthKey(day: string): string {
  return day.slice(0, 7);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function dayLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

// One month at a time, day by day, with the months stepped through by the
// arrows. Fed the full gap-filled daily series (getPageViewStats with no
// window), so every month between the first recorded view and today is
// reachable — including a month with no traffic at all, which shows as a
// flat zero line rather than vanishing from the switcher.
export function MonthlyViewsChart({ data }: { data: Day[] }) {
  const months = useMemo(() => {
    const byMonth = new Map<string, Day[]>();
    for (const d of data) {
      const key = monthKey(d.day);
      const bucket = byMonth.get(key);
      if (bucket) bucket.push(d);
      else byMonth.set(key, [d]);
    }
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, days]) => ({ key, days, total: days.reduce((sum, d) => sum + d.count, 0) }));
  }, [data]);

  // null = "follow the newest month". Kept as null rather than an index so
  // that when a new month begins the chart moves to it on its own; it only
  // pins to a specific month once the viewer steps back into an older one.
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  if (months.length === 0) {
    return <div className={`flex h-40 items-center justify-center text-sm ${mutedText}`}>No views recorded yet</div>;
  }

  const activeKey = pinnedKey && months.some((m) => m.key === pinnedKey) ? pinnedKey : months[months.length - 1].key;
  const index = months.findIndex((m) => m.key === activeKey);
  const active = months[index];
  const hasPrev = index > 0;
  const hasNext = index < months.length - 1;

  const series = active.days.map((d) => ({ label: dayLabel(d.day), value: d.count }));
  const busiest = active.days.reduce((best, d) => (d.count > best.count ? d : best), active.days[0]);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => hasPrev && setPinnedKey(months[index - 1].key)}
            disabled={!hasPrev}
            aria-label="Previous month"
            className={`${buttonGhostClass} px-2 py-1 leading-none`}
          >
            ←
          </button>
          <span className="min-w-[8.5rem] text-center text-sm font-medium">{monthLabel(active.key)}</span>
          <button
            type="button"
            // Stepping onto the newest month clears the pin, so the chart
            // resumes following whatever the newest month is later on.
            onClick={() => hasNext && setPinnedKey(index + 1 === months.length - 1 ? null : months[index + 1].key)}
            disabled={!hasNext}
            aria-label="Next month"
            className={`${buttonGhostClass} px-2 py-1 leading-none`}
          >
            →
          </button>
        </div>
        <div className={`text-right text-xs ${secondaryText}`}>
          <span className="font-semibold">{active.total.toLocaleString("en-IN")}</span> views
          {busiest && busiest.count > 0 && (
            <span className={mutedText}> · busiest {dayLabel(busiest.day)} ({busiest.count})</span>
          )}
        </div>
      </div>

      <div className="mt-4">
        <TrendLineChart data={series} />
      </div>

      <p className={`mt-1 text-[11px] ${mutedText}`}>
        Month {index + 1} of {months.length} · {months[0] && monthLabel(months[0].key)} onward
      </p>
    </div>
  );
}

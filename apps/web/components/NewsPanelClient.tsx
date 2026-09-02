"use client";

import { useMemo, useState } from "react";
import type { CompanyNewsItem } from "@startup-atlas/db";

// Roughly each outlet's own brand color, so the source dot doubles as a
// quick visual scan cue — Hacker News' orange in particular is instantly
// recognizable. Anything not in the map (a future feed) still gets a clean
// neutral treatment rather than breaking.
const SOURCE_DOT: Record<string, string> = {
  Inc42: "bg-violet-500",
  YourStory: "bg-red-500",
  Entrackr: "bg-sky-500",
  "Hacker News": "bg-orange-500",
};
const DEFAULT_DOT = "bg-neutral-400";

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  return `${months}mo`;
}

export function NewsPanelClient({
  articles,
  pageSize,
}: {
  articles: CompanyNewsItem[];
  pageSize: number;
}) {
  const [page, setPage] = useState(0);
  const pageCount = Math.ceil(articles.length / pageSize);
  const start = page * pageSize;
  const visible = useMemo(
    () => articles.slice(start, start + pageSize),
    [articles, start, pageSize],
  );

  return (
    <div>
      <ul className="space-y-3">
        {visible.map((a) => (
          <li key={a.id}>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-semibold leading-snug text-neutral-900 hover:text-emerald-700 hover:underline"
            >
              {a.title}
            </a>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SOURCE_DOT[a.source ?? ""] ?? DEFAULT_DOT}`} />
              <span className="text-xs text-neutral-500">{a.source ?? "Unknown"}</span>
              {relativeTime(a.publishedAt) && (
                <>
                  <span className="text-xs text-neutral-300">·</span>
                  <span className="text-xs text-neutral-400">{relativeTime(a.publishedAt)}</span>
                </>
              )}
              {a.category && (
                <span className="ml-auto shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                  {a.category}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {pageCount > 1 && (
        <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-2.5">
          <span className="text-xs text-neutral-400">
            {start + 1}–{Math.min(start + pageSize, articles.length)} of {articles.length}
          </span>
          <div className="flex items-center gap-1.5">
            {page > 0 && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 0))}
                className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                Prev
              </button>
            )}
            {page < pageCount - 1 && (
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
                className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-neutral-800"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

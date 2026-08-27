import { getRecentNews } from "@startup-atlas/db";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

// Roughly each outlet's own brand color, so the source badge doubles as a
// quick visual scan cue — Hacker News' orange in particular is instantly
// recognizable. Anything not in the map (a future feed) still gets a clean
// neutral treatment rather than breaking.
const SOURCE_STYLES: Record<string, { border: string; badge: string }> = {
  Inc42: { border: "border-violet-400", badge: "bg-violet-50 text-violet-700" },
  YourStory: { border: "border-red-400", badge: "bg-red-50 text-red-700" },
  Entrackr: { border: "border-sky-400", badge: "bg-sky-50 text-sky-700" },
  "Hacker News": { border: "border-orange-400", badge: "bg-orange-50 text-orange-700" },
};
const DEFAULT_STYLE = { border: "border-neutral-300", badge: "bg-neutral-100 text-neutral-600" };

// General industry news, not tied to any one listed company — deliberately
// separate from NewsPanel (which only ever shows articles a title-match
// actually linked to a specific brand) so this never reads as a claim that
// a headline is "about" a company on this map.
export async function GeneralNewsList({ limit }: { limit: number }) {
  const articles = await getRecentNews(limit);
  if (articles.length === 0) return null;

  return (
    <ul className="space-y-2">
      {articles.map((a) => {
        const style = (a.source && SOURCE_STYLES[a.source]) || DEFAULT_STYLE;
        return (
          <li key={a.id} className={`border-l-[3px] ${style.border} rounded-r-md bg-neutral-50/80 py-1.5 pl-2.5 pr-2 transition hover:bg-neutral-100`}>
            <a
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium leading-snug text-neutral-800 hover:text-emerald-700 hover:underline"
            >
              {a.title}
            </a>
            <div className="mt-1 flex items-center gap-1.5">
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${style.badge}`}>{a.source}</span>
              {formatDate(a.publishedAt) && (
                <span className="text-[10px] text-neutral-400">{formatDate(a.publishedAt)}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

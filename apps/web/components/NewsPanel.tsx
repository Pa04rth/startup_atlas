import type { CompanyNewsItem } from "@startup-atlas/db";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function NewsPanel({ articles }: { articles: CompanyNewsItem[] }) {
  if (articles.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-neutral-900">In the news</h2>
      <ul className="mt-2 space-y-2">
        {articles.map((a) => (
          <li key={a.id} className="text-sm">
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
              {a.title}
            </a>
            <span className="ml-1.5 text-xs text-neutral-400">
              {a.source}
              {formatDate(a.publishedAt) ? ` · ${formatDate(a.publishedAt)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

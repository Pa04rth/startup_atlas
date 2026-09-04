import { searchBrands } from "@startup-atlas/db";
import { cities } from "@startup-atlas/config";
import { cardClass, mutedText, secondaryText, inputClass, buttonPrimaryClass, buttonGhostClass, tableHeadClass, tableRowClass, StatusPill } from "../_theme";

const PAGE_SIZE = 25;

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  const { rows, total } = await searchBrands({
    cityId: params.city || undefined,
    status: (params.status as never) || undefined,
    query: params.q || undefined,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageUrl(nextPage: number) {
    const p = new URLSearchParams();
    if (params.city) p.set("city", params.city);
    if (params.status) p.set("status", params.status);
    if (params.q) p.set("q", params.q);
    p.set("page", String(nextPage));
    return `/admin/brands?${p.toString()}`;
  }

  return (
    <div>
      <h1 className="text-2xl font-normal font-[family-name:var(--font-heading)]">Brands</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>{total} total, across every status — this is the bulk fix-up view.</p>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search by name…" className={inputClass} />
        <select name="city" defaultValue={params.city ?? ""} className={inputClass}>
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className={inputClass}>
          <option value="">All statuses</option>
          {["published", "probable", "review", "archived"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className={buttonPrimaryClass}>
          Filter
        </button>
      </form>

      <div className={`mt-4 overflow-x-auto ${cardClass} !p-0`}>
        <table className="w-full text-left text-sm">
          <thead className={tableHeadClass}>
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">City</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Precision</th>
              <th className="px-3 py-2 font-medium">Website</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} className={tableRowClass}>
                <td className="px-3 py-2">
                  <a href={`/admin/brands/${b.id}`} className="font-medium text-[#201f1d] hover:underline">
                    {b.name}
                  </a>
                </td>
                <td className={`px-3 py-2 ${mutedText}`}>{b.cityId}</td>
                <td className="px-3 py-2">
                  <StatusPill value={b.status} />
                </td>
                <td className={`px-3 py-2 ${secondaryText}`}>{b.score}</td>
                <td className={`px-3 py-2 ${mutedText}`}>{b.precision ?? "—"}</td>
                <td className={`max-w-[200px] truncate px-3 py-2 ${mutedText}`}>{b.website ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className={`px-3 py-4 text-center ${mutedText}`}>
                  No brands match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`mt-3 flex items-center justify-between text-sm ${mutedText}`}>
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a href={pageUrl(page - 1)} className={buttonGhostClass}>
              ← Prev
            </a>
          )}
          {page < pageCount && (
            <a href={pageUrl(page + 1)} className={buttonGhostClass}>
              Next →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

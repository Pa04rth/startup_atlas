import { searchBrands } from "@startup-atlas/db";
import { cities } from "@startup-atlas/config";

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
      <h1 className="text-xl font-bold text-neutral-900">Brands</h1>
      <p className="mt-1 text-sm text-neutral-500">{total} total, across every status — this is the bulk fix-up view.</p>

      <form className="mt-4 flex flex-wrap gap-2" method="get">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Search by name…"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select name="city" defaultValue={params.city ?? ""} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm">
          <option value="">All statuses</option>
          {["published", "probable", "review", "archived"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white">
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
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
              <tr key={b.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <a href={`/admin/brands/${b.id}`} className="font-medium text-neutral-900 hover:underline">
                    {b.name}
                  </a>
                </td>
                <td className="px-3 py-2 text-neutral-500">{b.cityId}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-semibold " +
                      (b.status === "published"
                        ? "bg-emerald-50 text-emerald-700"
                        : b.status === "probable"
                          ? "bg-sky-50 text-sky-700"
                          : b.status === "review"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-neutral-100 text-neutral-500")
                    }
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-neutral-500">{b.score}</td>
                <td className="px-3 py-2 text-neutral-500">{b.precision ?? "—"}</td>
                <td className="px-3 py-2 max-w-[200px] truncate text-neutral-500">{b.website ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-neutral-400">
                  No brands match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-neutral-500">
        <span>
          Page {page} of {pageCount}
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <a href={pageUrl(page - 1)} className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50">
              ← Prev
            </a>
          )}
          {page < pageCount && (
            <a href={pageUrl(page + 1)} className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50">
              Next →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

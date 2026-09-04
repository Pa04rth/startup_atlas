import {
  getStatusCounts,
  getRecentIngestionRuns,
  getSubmissions,
  getPendingVerifications,
  getPageViewStats,
} from "@startup-atlas/db";
import { cardClass, mutedText, secondaryText, tableHeadClass, tableRowClass, StatusPill } from "./_theme";
import { TrendLineChart } from "./_charts/TrendLineChart";
import { GroupedBarChart } from "./_charts/GroupedBarChart";

function formatDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default async function AdminDashboardPage() {
  const [statusCounts, runs, submissions, payments, pageViews] = await Promise.all([
    getStatusCounts(),
    getRecentIngestionRuns(10),
    getSubmissions("pending"),
    getPendingVerifications(),
    getPageViewStats(7),
  ]);

  const cards = [
    { label: "Review queue", value: statusCounts.review ?? 0, href: "/admin/review" },
    { label: "Published", value: statusCounts.published ?? 0, href: undefined },
    { label: "Pending submissions", value: submissions.length, href: "/admin/submissions" },
    { label: "Pending payments", value: payments.length, href: "/admin/payments" },
    { label: "Page views (7d)", value: pageViews.totalViews, href: undefined },
  ];

  const pageViewSeries = pageViews.byDay.map((d) => ({ label: formatDay(d.day), value: d.count }));
  const ingestionSeries = [...runs]
    .reverse()
    .map((r) => ({ label: `${r.city_id} ${formatDay(r.started_at)}`, a: r.found, b: r.upserted }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-normal font-[family-name:var(--font-heading)]">Dashboard</h1>
        <p className={`mt-1 text-sm ${mutedText}`}>Everything that needs a decision, and the data underneath it.</p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {cards.map((c) => {
            const inner = (
              <>
                <p className="text-2xl font-semibold font-[family-name:var(--font-heading)]">{c.value}</p>
                <p className={`text-sm ${mutedText}`}>{c.label}</p>
              </>
            );
            return c.href ? (
              <a key={c.label} href={c.href} className={`${cardClass} block transition hover:border-[#b68235]/50`}>
                {inner}
              </a>
            ) : (
              <div key={c.label} className={cardClass}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={cardClass}>
          <h2 className="text-[15px] font-semibold font-[family-name:var(--font-heading)]">Page views — last 7 days</h2>
          <div className="mt-4">
            <TrendLineChart data={pageViewSeries} />
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="text-[15px] font-semibold font-[family-name:var(--font-heading)]">Ingestion runs — found vs upserted</h2>
          <div className="mt-4">
            <GroupedBarChart data={ingestionSeries} seriesLabels={["Found", "Upserted"]} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-[15px] font-semibold font-[family-name:var(--font-heading)]">Recent ingestion runs</h2>
        <div className={`mt-2 overflow-x-auto ${cardClass} !p-0`}>
          <table className="w-full text-left text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className="px-3 py-2 font-medium">City</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Found</th>
                <th className="px-3 py-2 font-medium">Upserted</th>
                <th className="px-3 py-2 font-medium">Needs review</th>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={tableRowClass}>
                  <td className={`px-3 py-2 ${secondaryText}`}>{r.city_id}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.source}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.found}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.upserted}</td>
                  <td className="px-3 py-2">
                    {r.needs_review > 0 ? <StatusPill value="review" /> : <span className={secondaryText}>0</span>}
                  </td>
                  <td className={`px-3 py-2 ${mutedText}`}>{new Date(r.started_at).toLocaleString("en-IN")}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-[#b3402c]">{r.notes ?? "—"}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={7} className={`px-3 py-4 text-center ${mutedText}`}>
                    No ingestion runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pageViews.topPaths.length > 0 && (
        <div>
          <h2 className="text-[15px] font-semibold font-[family-name:var(--font-heading)]">Top pages (7d)</h2>
          <div className={`mt-2 overflow-x-auto ${cardClass} !p-0`}>
            <table className="w-full text-left text-sm">
              <thead className={tableHeadClass}>
                <tr>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {pageViews.topPaths.map((p) => (
                  <tr key={p.path} className={tableRowClass}>
                    <td className={`px-3 py-2 ${secondaryText}`}>{p.path}</td>
                    <td className="px-3 py-2 text-[#201f1d]">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

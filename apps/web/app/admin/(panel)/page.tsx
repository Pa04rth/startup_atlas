import {
  getStatusCounts,
  getRecentIngestionRuns,
  getSubmissions,
  getPendingVerifications,
  getPageViewStats,
} from "@startup-atlas/db";

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
    { label: "Published", value: statusCounts.published ?? 0 },
    { label: "Pending submissions", value: submissions.length, href: "/admin/submissions" },
    { label: "Pending payments", value: payments.length, href: "/admin/payments" },
    { label: "Page views (7d)", value: pageViews.totalViews },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">Dashboard</h1>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cards.map((c) => (
            <div key={c.label} className="rounded-lg border border-neutral-200 bg-white p-4">
              <p className="text-2xl font-semibold text-neutral-900">{c.value}</p>
              <p className="text-sm text-neutral-500">{c.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Recent ingestion runs</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="px-3 py-2 font-medium">City</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Found</th>
                <th className="px-3 py-2 font-medium">Upserted</th>
                <th className="px-3 py-2 font-medium">Needs review</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-3 py-2">{r.city_id}</td>
                  <td className="px-3 py-2">{r.source}</td>
                  <td className="px-3 py-2">{r.found}</td>
                  <td className="px-3 py-2">{r.upserted}</td>
                  <td className="px-3 py-2">{r.needs_review}</td>
                  <td className="max-w-xs truncate px-3 py-2 text-red-600">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pageViews.topPaths.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Top pages (7d)</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-neutral-200 text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Path</th>
                  <th className="px-3 py-2 font-medium">Views</th>
                </tr>
              </thead>
              <tbody>
                {pageViews.topPaths.map((p) => (
                  <tr key={p.path} className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2 text-neutral-700">{p.path}</td>
                    <td className="px-3 py-2">{p.count}</td>
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

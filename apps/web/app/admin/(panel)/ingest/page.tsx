import { getRecentIngestionRuns } from "@startup-atlas/db";
import IngestClient from "./IngestClient";

export default async function IngestPage() {
  const runs = await getRecentIngestionRuns(15);

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Run ingest</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Queues a discovery run on GitHub Actions (
        <a
          href="https://github.com/Pa04rth/startup_atlas/actions/workflows/discovery.yml"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-neutral-700"
        >
          watch it run
        </a>
        ) — new brands land at whatever tier their score earns, same as the weekly automatic run.
      </p>

      <IngestClient />

      <div className="mt-8">
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
                <th className="px-3 py-2 font-medium">Started</th>
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
                  <td className="px-3 py-2 text-neutral-500">{new Date(r.started_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-neutral-400">
                    No ingestion runs recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { getRecentIngestionRuns } from "@startup-atlas/db";
import IngestClient from "./IngestClient";
import { cardClass, mutedText, tableHeadClass, tableRowClass } from "../_theme";

export default async function IngestPage() {
  const runs = await getRecentIngestionRuns(15);

  return (
    <div>
      <h1 className="text-2xl font-normal font-[family-name:var(--font-heading)]">Run ingest</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>
        Queues a discovery run on GitHub Actions (
        <a
          href="https://github.com/Pa04rth/startup_atlas/actions/workflows/discovery.yml"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#7d5411] underline hover:text-[#201f1d]"
        >
          watch it run
        </a>
        ) — new brands land at whatever tier their score earns, same as the weekly automatic run.
      </p>

      <IngestClient />

      <div className="mt-8">
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
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={tableRowClass}>
                  <td className="px-3 py-2 text-[#201f1d]">{r.city_id}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.source}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.found}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.upserted}</td>
                  <td className="px-3 py-2 text-[#201f1d]">{r.needs_review}</td>
                  <td className={`px-3 py-2 ${mutedText}`}>{new Date(r.started_at).toLocaleString("en-IN")}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={6} className={`px-3 py-4 text-center ${mutedText}`}>
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

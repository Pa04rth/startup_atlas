import type { BrandJobPosting } from "@startup-atlas/db";

function formatWalkinDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function JobsPanel({
  jobs,
  cityName,
  brandName,
  citySlug,
}: {
  jobs: BrandJobPosting[];
  cityName: string;
  brandName: string;
  citySlug: string;
}) {
  if (jobs.length === 0) return null;

  // Every ATS-sourced job on a brand carries the same board URL — walk-ins
  // (manually entered, no ATS) don't, so this naturally comes back
  // undefined when a brand only has walk-in postings, and the "pulled
  // from / refreshed daily" line below just doesn't render.
  const sourceUrl = jobs.find((j) => j.sourceUrl)?.sourceUrl;

  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {jobs.length} open role{jobs.length === 1 ? "" : "s"} in {cityName}
      </h2>

      <ul className="mt-3 divide-y divide-neutral-100">
        {jobs.map((job) => (
          <li key={job.id} className="flex items-start justify-between gap-4 py-3">
            <div className="min-w-0">
              <a href={`/${citySlug}/jobs/${job.id}`} className="font-medium text-neutral-900 hover:underline">
                {job.title ?? "Open role"}
              </a>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {job.isWalkin && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                    Walk-in{formatWalkinDate(job.walkinAt) ? ` · ${formatWalkinDate(job.walkinAt)}` : ""}
                  </span>
                )}
                {job.track && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{job.track}</span>
                )}
                {job.seniority && (
                  <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    {job.seniority}
                  </span>
                )}
                {job.fresherFriendly && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    fresher-friendly
                  </span>
                )}
                {job.venue && <span className="text-xs text-neutral-400">{job.venue}</span>}
              </div>
            </div>
            {job.applyUrl && (
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 whitespace-nowrap rounded-full bg-orange-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-orange-600"
              >
                Apply ↗
              </a>
            )}
          </li>
        ))}
      </ul>

      {sourceUrl && (
        <p className="mt-3 text-xs text-neutral-400">
          Pulled from{" "}
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-600">
            {brandName}&apos;s public job board
          </a>
          , refreshed daily.
        </p>
      )}
    </section>
  );
}

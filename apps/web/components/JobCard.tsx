import type { JobPosting } from "@startup-atlas/db";
import { CompanyLogo } from "./CompanyLogo";

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export function JobCard({ job, citySlug }: { job: JobPosting; citySlug: string }) {
  return (
    <div
      className={
        "flex h-full flex-col rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md " +
        (job.isWalkin ? "border-amber-200" : "border-neutral-200")
      }
    >
      <div className="flex items-start gap-3">
        <CompanyLogo src={job.brandLogoUrl} name={job.brandName} className="h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <a
            href={`/${citySlug}/jobs/${job.id}`}
            className="block truncate font-semibold text-neutral-900 hover:underline"
          >
            {job.title ?? "Open role"}
          </a>
          <a
            href={`/${citySlug}/company/${job.brandSlug}`}
            className="block truncate text-sm text-neutral-500 hover:text-neutral-800 hover:underline"
          >
            {job.brandName}
          </a>
        </div>
        {job.isWalkin && (
          <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            Walk-in
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.track && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{job.track}</span>
        )}
        {job.seniority && (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{job.seniority}</span>
        )}
        {job.fresherFriendly && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Fresher friendly
          </span>
        )}
      </div>

      {job.isWalkin && (job.venue || job.walkinAt) && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {job.venue}
          {job.walkinAt ? `${job.venue ? " — " : ""}${formatDate(job.walkinAt)}` : ""}
        </p>
      )}

      <div className="mt-auto pt-3">
        {job.applyUrl ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Apply ↗
          </a>
        ) : (
          <a
            href={`/${citySlug}/jobs/${job.id}`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            View details →
          </a>
        )}
      </div>
    </div>
  );
}

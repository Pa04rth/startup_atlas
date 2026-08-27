import Link from "next/link";
import type { JobPosting } from "@startup-atlas/db";

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
        "rounded-lg border p-4 " +
        (job.isWalkin ? "border-amber-300 bg-amber-50" : "border-neutral-200 bg-white")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-neutral-900">{job.title ?? "Open role"}</h3>
          <Link href={`/${citySlug}/company/${job.brandSlug}`} className="text-sm text-neutral-600 hover:underline">
            {job.brandName}
          </Link>
        </div>
        {job.isWalkin && (
          <span className="whitespace-nowrap rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900">
            Walk-in
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-neutral-500">
        {job.track && <span className="rounded-full bg-neutral-100 px-2 py-0.5">{job.track}</span>}
        {job.seniority && <span className="rounded-full bg-neutral-100 px-2 py-0.5">{job.seniority}</span>}
        {job.fresherFriendly && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Fresher friendly</span>
        )}
      </div>

      {job.isWalkin && (job.venue || job.walkinAt) && (
        <p className="mt-2 text-sm text-neutral-700">
          {job.venue}
          {job.walkinAt ? ` — ${formatDate(job.walkinAt)}` : ""}
        </p>
      )}

      {job.applyUrl && (
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          Apply →
        </a>
      )}
    </div>
  );
}

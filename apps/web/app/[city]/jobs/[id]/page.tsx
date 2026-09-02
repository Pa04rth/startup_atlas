import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import { getJobById } from "@startup-atlas/db";
import { CompanyLogo } from "@/components/CompanyLogo";

type Params = { city: string; id: string };

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function JobDetailPage({ params }: { params: Promise<Params> }) {
  const { city: cityId, id } = await params;
  const city = cities.find((c) => c.id === cityId);
  const jobId = Number(id);
  if (!city || !Number.isInteger(jobId)) notFound();

  const job = await getJobById(jobId);
  if (!job || job.cityId !== cityId) notFound();

  const expired = job.expiresAt ? new Date(job.expiresAt).getTime() < Date.now() : false;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <a
        href={`/${cityId}/jobs`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to jobs
      </a>

      <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <CompanyLogo src={job.brandLogoUrl} name={job.brandName} className="h-11 w-11 shrink-0 rounded" />
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-neutral-900">{job.title ?? "Open role"}</h1>
            <a href={`/${cityId}/company/${job.brandSlug}`} className="text-sm font-medium text-neutral-600 hover:underline">
              {job.brandName}
            </a>
            {job.brandTagline && <p className="mt-0.5 text-sm text-neutral-500">{job.brandTagline}</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {job.isWalkin && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">Walk-in</span>
          )}
          {job.track && <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">{job.track}</span>}
          {job.seniority && <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">{job.seniority}</span>}
          {job.fresherFriendly && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">Fresher friendly</span>
          )}
          {expired && (
            <span className="rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-600">No longer listed as open</span>
          )}
        </div>

        {job.isWalkin && (job.venue || job.walkinAt) && (
          <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {job.venue && <p className="font-medium">{job.venue}</p>}
            {formatDate(job.walkinAt) && <p className="mt-0.5">{formatDate(job.walkinAt)}</p>}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          {formatDate(job.postedAt) && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral-400">Posted</dt>
              <dd className="mt-0.5 text-neutral-700">{formatDate(job.postedAt)}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase tracking-wide text-neutral-400">City</dt>
            <dd className="mt-0.5 text-neutral-700">{city.name}</dd>
          </div>
        </dl>

        {job.applyUrl && !expired ? (
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full rounded-lg bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            Apply on {job.brandName}&apos;s job board ↗
          </a>
        ) : (
          <p className="mt-6 text-sm text-neutral-500">
            This role isn&apos;t confirmed open anymore — check {job.brandName}&apos;s profile for anything more recent.
          </p>
        )}

        {job.sourceUrl && (
          <p className="mt-3 text-center text-xs text-neutral-400">
            Pulled from{" "}
            <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-600">
              {job.brandName}&apos;s public job board
            </a>
            , refreshed daily.
          </p>
        )}
      </div>
    </main>
  );
}

import { getSubmissions } from "@startup-atlas/db";
import { approveSubmission, rejectSubmission } from "@/lib/admin/actions";

function logoPathFrom(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "logoPath" in raw && typeof raw.logoPath === "string") {
    return raw.logoPath;
  }
  return null;
}

export default async function SubmissionsPage() {
  const submissions = await getSubmissions("pending");

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Submissions</h1>
      <p className="mt-1 text-sm text-neutral-500">{submissions.length} pending from the public /submit form.</p>

      <div className="mt-4 space-y-2">
        {submissions.map((s) => (
          <div key={s.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                {logoPathFrom(s.raw) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPathFrom(s.raw)!}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-neutral-200 object-contain"
                  />
                )}
                <div className="min-w-0">
                <p className="font-medium text-neutral-900">
                  {s.name}{" "}
                  {s.kind === "edit" ? (
                    <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      Edit request
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                      New
                    </span>
                  )}
                </p>
                <p className="text-xs text-neutral-500">
                  {s.cityId}
                  {s.stage ? ` · ${s.stage}` : ""}
                  {s.hiring ? " · hiring" : ""}
                </p>
                {s.tagline && <p className="mt-1 text-sm text-neutral-600">{s.tagline}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                      website
                    </a>
                  )}
                  {s.jobsUrl && (
                    <a href={s.jobsUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                      jobs page
                    </a>
                  )}
                  {s.email && <span>{s.email}</span>}
                </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={approveSubmission.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectSubmission.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-neutral-400">
        "Approve" creates (or updates) the real brand row and uploads any attached logo to R2 — a new
        submission still lands in the tier its score earns (check{" "}
        <a href="/admin/review" className="underline hover:text-neutral-600">
          the review queue
        </a>{" "}
        if it doesn't show up on the public map right away).
      </p>
    </div>
  );
}

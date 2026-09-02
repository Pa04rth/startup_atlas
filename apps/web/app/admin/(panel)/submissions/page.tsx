import { getSubmissions } from "@startup-atlas/db";
import { approveSubmission, rejectSubmission } from "@/lib/admin/actions";
import { cardClass, mutedText, secondaryText, buttonPrimaryClass, buttonGhostClass, statusBadgeClass } from "../_theme";

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
      <h1 className="text-xl font-bold text-white">Submissions</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>{submissions.length} pending from the public /submit form.</p>

      <div className="mt-4 space-y-2">
        {submissions.map((s) => (
          <div key={s.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 gap-3">
                {logoPathFrom(s.raw) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPathFrom(s.raw)!}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded border border-white/10 bg-white object-contain"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {s.name}{" "}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                        s.kind === "edit" ? statusBadgeClass.warning : statusBadgeClass.good
                      }`}
                    >
                      {s.kind === "edit" ? "Edit request" : "New"}
                    </span>
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    {s.cityId}
                    {s.stage ? ` · ${s.stage}` : ""}
                    {s.hiring ? " · hiring" : ""}
                  </p>
                  {s.tagline && <p className={`mt-1 text-sm ${secondaryText}`}>{s.tagline}</p>}
                  <div className={`mt-1 flex flex-wrap gap-3 text-xs ${mutedText}`}>
                    {s.website && (
                      <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-[#6ba5ec] hover:underline">
                        website
                      </a>
                    )}
                    {s.jobsUrl && (
                      <a href={s.jobsUrl} target="_blank" rel="noopener noreferrer" className="text-[#6ba5ec] hover:underline">
                        jobs page
                      </a>
                    )}
                    {s.email && <span>{s.email}</span>}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={approveSubmission.bind(null, s.id)}>
                  <button type="submit" className={buttonPrimaryClass}>
                    Approve
                  </button>
                </form>
                <form action={rejectSubmission.bind(null, s.id)}>
                  <button type="submit" className={buttonGhostClass}>
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {submissions.length === 0 && <p className={`text-sm ${mutedText}`}>Nothing pending.</p>}
      </div>

      <p className={`mt-6 text-xs ${mutedText}`}>
        "Approve" creates (or updates) the real brand row and uploads any attached logo to R2 — a new
        submission still lands in the tier its score earns (check{" "}
        <a href="/admin/review" className="underline hover:text-white">
          the review queue
        </a>{" "}
        if it doesn't show up on the public map right away).
      </p>
    </div>
  );
}

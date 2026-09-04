import { getSubmissions } from "@startup-atlas/db";
import { approveSubmission, rejectSubmission } from "@/lib/admin/actions";
import { cardClass, mutedText, secondaryText, buttonPrimaryClass, buttonGhostClass, statusBadgeClass } from "../_theme";

function logoPathFrom(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "logoPath" in raw && typeof raw.logoPath === "string") {
    return raw.logoPath;
  }
  return null;
}

// sector/area have no columns of their own — /submit carries them in the
// raw JSON and convertSubmissionToBrand applies them on approval (area
// decides whether the pin lands on that area's centroid or the city's), so
// they're worth seeing before clicking Approve.
function rawField(raw: unknown, key: "sector" | "area"): string | null {
  if (raw && typeof raw === "object" && key in raw) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

// Self-reported openings from ManageCompanyForm's "Open roles" section.
// These get written straight into job_postings on approval — including a
// walk-in's venue and date, which nothing verifies — so they need to be
// visible here before anyone clicks Approve.
type SubmittedRole = { title?: string; applyUrl?: string; isWalkin?: boolean; venue?: string; walkinAt?: string };

function rolesFrom(raw: unknown): SubmittedRole[] {
  if (!raw || typeof raw !== "object" || !("roles" in raw)) return [];
  const roles = (raw as { roles: unknown }).roles;
  if (!Array.isArray(roles)) return [];
  return roles.filter((r): r is SubmittedRole => !!r && typeof r === "object" && typeof r.title === "string");
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
                    {rawField(s.raw, "area") ? ` · ${rawField(s.raw, "area")}` : ""}
                    {rawField(s.raw, "sector") ? ` · ${rawField(s.raw, "sector")}` : ""}
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

                  {rolesFrom(s.raw).length > 0 && (
                    <div className="mt-2 space-y-1 border-l-2 border-white/10 pl-3">
                      <p className={`text-[11px] font-semibold uppercase tracking-wide ${mutedText}`}>
                        {rolesFrom(s.raw).length} role{rolesFrom(s.raw).length === 1 ? "" : "s"} submitted
                      </p>
                      {rolesFrom(s.raw).map((role, i) => (
                        <div key={i} className={`text-xs ${secondaryText}`}>
                          <span className="text-white">{role.title}</span>
                          {role.isWalkin && (
                            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass.warning}`}>
                              Walk-in
                            </span>
                          )}
                          {role.isWalkin && (role.venue || role.walkinAt) && (
                            <span className={`ml-1.5 ${mutedText}`}>
                              {role.venue}
                              {role.walkinAt ? `${role.venue ? " · " : ""}${role.walkinAt}` : ""}
                            </span>
                          )}
                          {role.applyUrl && (
                            <a
                              href={role.applyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-1.5 text-[#6ba5ec] hover:underline"
                            >
                              apply link
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
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

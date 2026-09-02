"use client";

import { useState, useTransition } from "react";
import type { ReferralOffer, ReferralRequest, ReferralRequestStatus } from "@startup-atlas/db";
import { approveReferralOffer, rejectReferralOffer, setReferralRequestState } from "@/lib/admin/actions";
import { cardClass, mutedText, secondaryText, buttonPrimaryClass, buttonGhostClass, buttonDangerClass, inputClass, StatusPill } from "../_theme";

const NEXT_STATUS: Record<ReferralRequestStatus, ReferralRequestStatus[]> = {
  requested: [],
  paid: ["fulfilled", "refunded"],
  fulfilled: ["released", "refunded"],
  released: [],
  refunded: [],
  rejected: [],
};

export default function ReferralsAdminClient({
  offers,
  requests,
}: {
  offers: ReferralOffer[];
  requests: ReferralRequest[];
}) {
  const [isPending, startTransition] = useTransition();
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  function approve(id: number) {
    startTransition(() => approveReferralOffer(id));
  }
  function reject(id: number) {
    startTransition(async () => {
      await rejectReferralOffer(id, notes);
      setRejectingId(null);
      setNotes("");
    });
  }
  function advance(id: number, status: ReferralRequestStatus) {
    startTransition(() => setReferralRequestState(id, status));
  }

  return (
    <div className="mt-6 space-y-10">
      <section>
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${mutedText}`}>
          Offers awaiting verification ({offers.length})
        </h2>
        <div className="mt-3 space-y-3">
          {offers.length === 0 && <p className={`text-sm ${mutedText}`}>Nothing pending.</p>}
          {offers.map((o) => (
            <div key={o.id} className={cardClass}>
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.proofUrl}
                  alt="Proof of employment"
                  className="h-24 w-24 shrink-0 rounded-md border border-white/10 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">
                    {o.referrerName}
                    {o.referrerRole ? ` · ${o.referrerRole}` : ""}
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    {o.referrerEmail}
                    {o.referrerLinkedin ? (
                      <>
                        {" · "}
                        <a href={o.referrerLinkedin} target="_blank" rel="noopener noreferrer" className="text-[#6ba5ec] underline">
                          LinkedIn
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className={`mt-1 text-sm ${secondaryText}`}>Role: {o.jobTitle}</p>
                  {o.proofNote && <p className={`mt-1 text-xs ${mutedText}`}>Proof note: {o.proofNote}</p>}
                  {o.pitch && <p className={`mt-1 text-sm ${secondaryText}`}>Pitch: {o.pitch}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button type="button" disabled={isPending} onClick={() => approve(o.id)} className={buttonPrimaryClass}>
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setRejectingId(rejectingId === o.id ? null : o.id)}
                    className={buttonGhostClass}
                  >
                    Reject
                  </button>
                </div>
              </div>
              {rejectingId === o.id && (
                <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason (e.g. proof doesn't show the company name)"
                    className={`flex-1 ${inputClass}`}
                  />
                  <button type="button" disabled={isPending} onClick={() => reject(o.id)} className={buttonDangerClass}>
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${mutedText}`}>
          Referral requests ({requests.length})
        </h2>
        <div className="mt-3 space-y-2">
          {requests.length === 0 && <p className={`text-sm ${mutedText}`}>None yet.</p>}
          {requests.map((r) => (
            <div key={r.id} className={cardClass}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {r.candidateName} → {r.brandName} ({r.offerJobTitle})
                  </p>
                  <p className={`text-xs ${mutedText}`}>
                    {r.candidateEmail}
                    {r.candidatePhone ? ` · ${r.candidatePhone}` : ""}
                  </p>
                  <p className={`mt-1 text-xs ${mutedText}`}>
                    Referrer: {r.offerReferrerName} ({r.offerReferrerEmail}) — pay them{" "}
                    <strong className={secondaryText}>₹{r.referrerCutInr}</strong> by UPI once fulfilled, before marking
                    released.
                  </p>
                  {r.resumeUrl && (
                    <a href={r.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-[#6ba5ec] underline">
                      Resume
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusPill value={r.status} />
                  <div className="flex gap-1.5">
                    {NEXT_STATUS[r.status].map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={isPending}
                        onClick={() => advance(r.id, next)}
                        className={`${buttonGhostClass} px-2.5 py-1 text-xs`}
                      >
                        Mark {next}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

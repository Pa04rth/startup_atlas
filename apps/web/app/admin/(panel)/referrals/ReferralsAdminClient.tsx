"use client";

import { useState, useTransition } from "react";
import type { ReferralOffer, ReferralRequest, ReferralRequestStatus } from "@startup-atlas/db";
import { approveReferralOffer, rejectReferralOffer, setReferralRequestState } from "@/lib/admin/actions";

const NEXT_STATUS: Record<ReferralRequestStatus, ReferralRequestStatus[]> = {
  requested: [],
  paid: ["fulfilled", "refunded"],
  fulfilled: ["released", "refunded"],
  released: [],
  refunded: [],
  rejected: [],
};

const STATUS_STYLE: Record<ReferralRequestStatus, string> = {
  requested: "bg-neutral-100 text-neutral-600",
  paid: "bg-sky-50 text-sky-700",
  fulfilled: "bg-amber-50 text-amber-700",
  released: "bg-emerald-50 text-emerald-700",
  refunded: "bg-red-50 text-red-700",
  rejected: "bg-red-50 text-red-700",
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Offers awaiting verification ({offers.length})
        </h2>
        <div className="mt-3 space-y-3">
          {offers.length === 0 && <p className="text-sm text-neutral-400">Nothing pending.</p>}
          {offers.map((o) => (
            <div key={o.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.proofUrl}
                  alt="Proof of employment"
                  className="h-24 w-24 shrink-0 rounded-md border border-neutral-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-neutral-900">
                    {o.referrerName}
                    {o.referrerRole ? ` · ${o.referrerRole}` : ""}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {o.referrerEmail}
                    {o.referrerLinkedin ? (
                      <>
                        {" · "}
                        <a href={o.referrerLinkedin} target="_blank" rel="noopener noreferrer" className="underline">
                          LinkedIn
                        </a>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm text-neutral-700">Role: {o.jobTitle}</p>
                  {o.proofNote && <p className="mt-1 text-xs text-neutral-500">Proof note: {o.proofNote}</p>}
                  {o.pitch && <p className="mt-1 text-sm text-neutral-600">Pitch: {o.pitch}</p>}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => approve(o.id)}
                    className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setRejectingId(rejectingId === o.id ? null : o.id)}
                    className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
              {rejectingId === o.id && (
                <div className="mt-3 flex gap-2 border-t border-neutral-100 pt-3">
                  <input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Reason (e.g. proof doesn't show the company name)"
                    className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
                  />
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => reject(o.id)}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    Confirm reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Referral requests ({requests.length})
        </h2>
        <div className="mt-3 space-y-2">
          {requests.length === 0 && <p className="text-sm text-neutral-400">None yet.</p>}
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    {r.candidateName} → {r.brandName} ({r.offerJobTitle})
                  </p>
                  <p className="text-xs text-neutral-500">
                    {r.candidateEmail}
                    {r.candidatePhone ? ` · ${r.candidatePhone}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Referrer: {r.offerReferrerName} ({r.offerReferrerEmail}) — pay them{" "}
                    <strong>₹{r.referrerCutInr}</strong> by UPI once fulfilled, before marking released.
                  </p>
                  {r.resumeUrl && (
                    <a href={r.resumeUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-emerald-700 underline">
                      Resume
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${STATUS_STYLE[r.status]}`}>
                    {r.status}
                  </span>
                  <div className="flex gap-1.5">
                    {NEXT_STATUS[r.status].map((next) => (
                      <button
                        key={next}
                        type="button"
                        disabled={isPending}
                        onClick={() => advance(r.id, next)}
                        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
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

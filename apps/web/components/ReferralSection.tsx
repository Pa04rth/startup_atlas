"use client";

import { useState } from "react";
import type { BrandJobPosting, PublicReferralOffer } from "@startup-atlas/db";
import { ReferralOfferForm } from "./forms/ReferralOfferForm";
import { ReferralRequestForm } from "./forms/ReferralRequestForm";

export function ReferralSection({
  cityId,
  brandSlug,
  brandName,
  offers,
  jobs,
}: {
  cityId: string;
  brandSlug: string;
  brandName: string;
  offers: PublicReferralOffer[];
  jobs: BrandJobPosting[];
}) {
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [requestingOffer, setRequestingOffer] = useState<PublicReferralOffer | null>(null);

  if (requestingOffer) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Request a referral</h2>
        <ReferralRequestForm offer={requestingOffer} onDone={() => setRequestingOffer(null)} />
      </section>
    );
  }

  if (showOfferForm) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">Post a referral offer</h2>
        <ReferralOfferForm
          cityId={cityId}
          brandSlug={brandSlug}
          brandName={brandName}
          jobs={jobs}
          onDone={() => setShowOfferForm(false)}
        />
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Get referred</h2>
        <button
          type="button"
          onClick={() => setShowOfferForm(true)}
          className="rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900"
        >
          Work here? Post a referral offer
        </button>
      </div>

      {offers.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">
          No verified referral offers yet — be the first if you work at {brandName}.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{offer.jobTitle}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    Referred by {offer.referrerName}
                    {offer.referrerRole ? `, ${offer.referrerRole}` : ""}
                    <span className="ml-1.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                      Verified
                    </span>
                  </p>
                  {offer.pitch && <p className="mt-1.5 text-sm text-neutral-600">{offer.pitch}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setRequestingOffer(offer)}
                  className="shrink-0 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                >
                  Request — ₹100
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

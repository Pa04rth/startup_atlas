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
        <h2 className="mb-3 text-sm font-semibold">Request a referral</h2>
        <ReferralRequestForm offer={requestingOffer} onDone={() => setRequestingOffer(null)} />
      </section>
    );
  }

  if (showOfferForm) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold">Post a referral offer</h2>
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
        <h2 className="m-0 text-[15px] sm:text-base">Get referred</h2>
        <button
          type="button"
          onClick={() => setShowOfferForm(true)}
          className="cf-secondary !px-2.5 !py-1.5 !text-[11.5px]"
        >
          Work here? Post a referral offer
        </button>
      </div>

      {offers.length === 0 ? (
        <p className="mt-2.5 text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
          No verified referral offers yet — be the first if you work at {brandName}.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-sm border p-4" style={{ borderColor: "var(--color-divider)", background: "var(--color-bg)" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{offer.jobTitle}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--color-neutral-600)" }}>
                    Referred by {offer.referrerName}
                    {offer.referrerRole ? `, ${offer.referrerRole}` : ""}
                    <span className="ml-1.5 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase" style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}>
                      Verified
                    </span>
                  </p>
                  {offer.pitch && <p className="mt-1.5 text-[13px]" style={{ color: "var(--color-neutral-700)" }}>{offer.pitch}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setRequestingOffer(offer)}
                  className="cf-primary !w-auto shrink-0 whitespace-nowrap !px-3.5 !py-2 !text-[12.5px]"
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

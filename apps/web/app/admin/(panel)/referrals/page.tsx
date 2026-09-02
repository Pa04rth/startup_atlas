import { getPendingReferralOffers, getReferralRequestsForAdmin } from "@startup-atlas/db";
import ReferralsAdminClient from "./ReferralsAdminClient";

export default async function ReferralsAdminPage() {
  const [offers, requests] = await Promise.all([
    getPendingReferralOffers(),
    getReferralRequestsForAdmin(),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Referrals</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Verify referrer proof before an offer goes public, then track paid requests through delivery and payout.
      </p>
      <ReferralsAdminClient offers={offers} requests={requests} />
    </div>
  );
}

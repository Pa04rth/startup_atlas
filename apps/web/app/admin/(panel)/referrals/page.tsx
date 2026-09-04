import { getPendingReferralOffers, getReferralRequestsForAdmin } from "@startup-atlas/db";
import ReferralsAdminClient from "./ReferralsAdminClient";
import { mutedText } from "../_theme";

export default async function ReferralsAdminPage() {
  const [offers, requests] = await Promise.all([
    getPendingReferralOffers(),
    getReferralRequestsForAdmin(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-normal font-[family-name:var(--font-heading)]">Referrals</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>
        Verify referrer proof before an offer goes public, then track paid requests through delivery and payout.
      </p>
      <ReferralsAdminClient offers={offers} requests={requests} />
    </div>
  );
}

import { getPendingVerifications } from "@startup-atlas/db";
import { approvePayment, rejectPayment } from "@/lib/admin/actions";
import { cardClass, mutedText, secondaryText, buttonPrimaryClass, buttonGhostClass, inputClass } from "../_theme";

const KIND_LABELS: Record<string, string> = {
  ad_booking: "Ad booking",
  subscription: "Subscription",
  connect_request: "Paid connect",
  referral_request: "Referral",
};

export default async function PaymentsQueuePage() {
  const verifications = await getPendingVerifications();

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Payments</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>
        {verifications.length} pending — cross-check the transaction id against your own UPI app before
        approving. Approving here also flips the underlying booking to live.
      </p>

      <div className="mt-4 space-y-2">
        {verifications.map((v) => (
          <div key={v.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-white">
                  {KIND_LABELS[v.kind] ?? v.kind} · ₹{v.amountInr.toLocaleString("en-IN")}
                </p>
                <p className={`text-xs ${mutedText}`}>
                  {v.payerName ?? "—"} · {v.payerContact} · ref #{v.referenceId}
                </p>
                <p className={`mt-1 font-mono text-sm ${secondaryText}`}>{v.transactionId}</p>
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <form action={approvePayment.bind(null, v.id)}>
                  <button type="submit" className={`w-full ${buttonPrimaryClass}`}>
                    Approve
                  </button>
                </form>
                <form
                  action={async (formData: FormData) => {
                    "use server";
                    await rejectPayment(v.id, String(formData.get("notes") ?? ""));
                  }}
                  className="flex gap-1"
                >
                  <input name="notes" placeholder="reason" className={`w-24 ${inputClass}`} />
                  <button type="submit" className={buttonGhostClass}>
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {verifications.length === 0 && <p className={`text-sm ${mutedText}`}>Nothing pending.</p>}
      </div>
    </div>
  );
}

import { getPendingVerifications } from "@startup-atlas/db";
import { approvePayment, rejectPayment } from "@/lib/admin/actions";

const KIND_LABELS: Record<string, string> = {
  ad_booking: "Ad booking",
  subscription: "Subscription",
  connect_request: "Paid connect",
};

export default async function PaymentsQueuePage() {
  const verifications = await getPendingVerifications();

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Payments</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {verifications.length} pending — cross-check the transaction id against your own UPI app before
        approving. Approving here also flips the underlying booking to live.
      </p>

      <div className="mt-4 space-y-2">
        {verifications.map((v) => (
          <div key={v.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">
                  {KIND_LABELS[v.kind] ?? v.kind} · ₹{v.amountInr.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-neutral-500">
                  {v.payerName ?? "—"} · {v.payerContact} · ref #{v.referenceId}
                </p>
                <p className="mt-1 font-mono text-sm text-neutral-800">{v.transactionId}</p>
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <form action={approvePayment.bind(null, v.id)}>
                  <button
                    type="submit"
                    className="w-full rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                  >
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
                  <input
                    name="notes"
                    placeholder="reason"
                    className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="submit"
                    className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

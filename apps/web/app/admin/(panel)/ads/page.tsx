import { getAdBookings, getAdBookingCounts, type AdStatus } from "@startup-atlas/db";
import { approveAdBooking, rejectAdBooking, expireAdBooking } from "@/lib/admin/actions";
import { cardClass, mutedText, secondaryText, buttonPrimaryClass, buttonGhostClass, statusBadgeClass } from "../_theme";

const KIND_LABELS: Record<string, string> = {
  banner: "Banner",
  boost: "Boosted pin",
  flash: "Flash",
  featured: "Sponsor tile",
};

// Tabs rather than one undifferentiated list: 'waitlisted' is the queue that
// actually needs a decision, and it's the one that had no screen at all
// before this page existed.
const TABS: Array<{ status: AdStatus; label: string }> = [
  { status: "waitlisted", label: "Waitlisted" },
  { status: "live", label: "Live" },
  { status: "expired", label: "Expired" },
  { status: "rejected", label: "Rejected" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

export default async function AdsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active: AdStatus = TABS.some((t) => t.status === status) ? (status as AdStatus) : "waitlisted";

  const [bookings, counts] = await Promise.all([getAdBookings(active), getAdBookingCounts()]);

  return (
    <div>
      <h1 className="text-2xl font-normal font-[family-name:var(--font-heading)]">Ads</h1>
      <p className={`mt-1 text-sm ${mutedText}`}>
        Bookings from the advertise form. Approving publishes the placement immediately — confirm the payment
        in your own UPI app first, or use the Payments screen when the advertiser has uploaded a receipt.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <a
            key={tab.status}
            href={`/admin/ads?status=${tab.status}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tab.status === active ? "bg-[#2d2b2b] text-[#f8f4f4]" : `border border-[#201f1d]/16 ${secondaryText}`
            }`}
          >
            {tab.label} ({counts[tab.status] ?? 0})
          </a>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {bookings.map((b) => (
          <div key={b.id} className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-[#201f1d]">
                  {KIND_LABELS[b.kind] ?? b.kind} · ₹{b.amountInr.toLocaleString("en-IN")}
                  {b.hasVerification && (
                    <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusBadgeClass.good}`}>
                      Receipt uploaded
                    </span>
                  )}
                </p>
                <p className={`text-xs ${mutedText}`}>
                  {b.cityId}
                  {b.brandName ? ` · ${b.brandName}` : " · no company linked"}
                  {` · booked ${formatDate(b.createdAt)}`}
                </p>
                <p className={`mt-1 text-sm ${secondaryText}`}>{b.contactEmail ?? "no contact email"}</p>
                {b.status === "live" && (
                  <p className={`mt-1 text-xs ${mutedText}`}>
                    Runs {formatDate(b.startsAt)} → {formatDate(b.endsAt)}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                {b.status !== "live" && (
                  <form action={approveAdBooking.bind(null, b.id)}>
                    <button type="submit" className={`w-full ${buttonPrimaryClass}`}>
                      {b.status === "waitlisted" ? "Approve & go live" : "Set live"}
                    </button>
                  </form>
                )}
                {b.status === "live" && (
                  <form action={expireAdBooking.bind(null, b.id)}>
                    <button type="submit" className={`w-full ${buttonGhostClass}`}>
                      End now
                    </button>
                  </form>
                )}
                {b.status !== "rejected" && b.status !== "live" && (
                  <form action={rejectAdBooking.bind(null, b.id)}>
                    <button type="submit" className={`w-full ${buttonGhostClass}`}>
                      Reject
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        ))}
        {bookings.length === 0 && <p className={`text-sm ${mutedText}`}>Nothing here.</p>}
      </div>
    </div>
  );
}

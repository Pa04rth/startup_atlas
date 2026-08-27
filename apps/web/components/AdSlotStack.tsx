import Link from "next/link";
import { getLiveAds, type AdKind } from "@startup-atlas/db";
import { AD_LABELS } from "@startup-atlas/config";
import { CompanyLogo } from "./CompanyLogo";

// "7 days" -> number "7", unit "d" — reads the period straight out of
// AD_LABELS (packages/config/src/pricing.ts) rather than duplicating it
// here, so a price/period change in one place never drifts out of sync.
function parsePriceAndPeriod(label: string): { price: string; periodNumber: string; periodUnit: string } {
  const [, rest] = label.split(" — ₹");
  const [price, period] = (rest ?? "").split(" / ");
  const [periodNumber, periodWord] = (period ?? "").split(" ");
  return {
    price: price ?? "",
    periodNumber: periodNumber ?? "",
    periodUnit: (periodWord ?? "").startsWith("hour") ? "h" : "d",
  };
}

// A vertical stack of `count` inventory slots for one ad kind — nothing
// stops two different startups both booking a "boost" at once, so this
// shows every currently-live booking as a real card (brand logo + "AD"
// badge, mirroring the reference layout), then fills whatever's left with
// an open-slot placeholder that shows the real price. Never invents a slot
// count beyond what's asked for — `count` is just how many positions this
// panel has room to display.
export async function AdSlotStack({ cityId, kind, count }: { cityId: string; kind: AdKind; count: number }) {
  const ads = await getLiveAds(cityId, kind);
  const label = AD_LABELS[kind] ?? kind;
  const shortLabel = label.split(" — ")[0];
  const { price, periodNumber, periodUnit } = parsePriceAndPeriod(label);
  const openSlots = Math.max(count - ads.length, 0);
  const isFlash = kind === "flash";

  return (
    <div className="flex flex-col gap-2">
      {ads.slice(0, count).map((ad) => (
        <Link
          key={ad.id}
          href={ad.brandSlug ? `/${cityId}/company/${ad.brandSlug}` : "/advertise"}
          className="group relative flex h-20 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm transition hover:shadow-md"
        >
          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
            Ad
          </span>
          <CompanyLogo src={ad.brandLogoUrl} name={ad.brandName ?? "?"} className="h-9 w-9 shrink-0 rounded" />
          <span className="absolute inset-x-0 bottom-0 truncate bg-white/90 px-1.5 py-1 text-center text-[10px] font-medium text-neutral-800">
            {ad.brandName ?? shortLabel}
          </span>
        </Link>
      ))}

      {Array.from({ length: openSlots }).map((_, i) =>
        isFlash ? (
          <Link
            key={`open-${i}`}
            href="/advertise"
            className="group flex h-20 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 px-2 text-center transition hover:border-orange-400 hover:bg-orange-100"
          >
            <span className="text-base leading-none">⚡</span>
            <span className="text-[10px] font-semibold leading-tight text-orange-700">{periodNumber}-hr flash slot</span>
            <span className="text-[10px] font-medium text-orange-600">₹{price}</span>
          </Link>
        ) : (
          <Link
            key={`open-${i}`}
            href="/advertise"
            className="group flex h-20 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-2 text-center transition hover:border-emerald-400 hover:bg-emerald-50"
          >
            <span className="text-[10px] font-medium leading-tight text-neutral-500 group-hover:text-emerald-700">
              Promote your startup
            </span>
            <span className="text-[10px] text-neutral-400 group-hover:text-emerald-600">
              ₹{price} / {periodNumber}{periodUnit}
            </span>
          </Link>
        )
      )}
    </div>
  );
}

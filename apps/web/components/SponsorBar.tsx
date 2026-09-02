import { getLiveAds } from "@startup-atlas/db";
import { DismissibleBar } from "./DismissibleBar";

export async function SponsorBar({ cityId }: { cityId: string }) {
  const ads = await getLiveAds(cityId, "featured");

  if (ads.length === 0) {
    return (
      <DismissibleBar label="Dismiss sponsor spot">
        <a
          href="/advertise"
          className="block border-b border-neutral-200 bg-neutral-50 px-4 py-2 pr-9 text-center text-sm text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          This sponsor spot is open — <span className="font-medium text-emerald-700">feature your startup here →</span>
        </a>
      </DismissibleBar>
    );
  }

  return (
    <DismissibleBar label="Dismiss sponsor bar">
      <div className="border-b border-neutral-200 bg-amber-50 px-4 py-2 pr-9 text-center text-sm text-amber-900">
        {ads.length} sponsor{ads.length > 1 ? "s" : ""} featured this week
      </div>
    </DismissibleBar>
  );
}

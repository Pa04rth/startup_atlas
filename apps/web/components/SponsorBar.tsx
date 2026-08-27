import { getLiveAds } from "@startup-atlas/db";

export async function SponsorBar({ cityId }: { cityId: string }) {
  const ads = await getLiveAds(cityId, "featured");
  // Zero live ads → render nothing, never an empty placeholder box.
  if (ads.length === 0) return null;

  return (
    <div className="border-b border-neutral-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
      {ads.length} sponsor{ads.length > 1 ? "s" : ""} featured this week
    </div>
  );
}

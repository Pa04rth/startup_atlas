import { getLiveAds, type AdKind } from "@startup-atlas/db";

export async function AdSlot({ cityId, kind }: { cityId: string; kind: AdKind }) {
  const ads = await getLiveAds(cityId, kind);
  // Zero live ads → render nothing, never an empty placeholder box.
  if (ads.length === 0) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-900">
      {ads.length} {kind} ad{ads.length > 1 ? "s" : ""} live
    </div>
  );
}

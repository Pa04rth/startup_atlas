import { notFound } from "next/navigation";
import { getOpenJobs } from "@startup-atlas/db";
import { getCitySnapshot } from "@/lib/snapshot";
import { CityExplorer } from "@/components/CityExplorer";
import { SponsorBar } from "@/components/SponsorBar";
import { AdSlotStack } from "@/components/AdSlotStack";
import { GeneralNewsList } from "@/components/GeneralNewsList";

export const revalidate = 300;

// Kill-switch for every paid ad surface (SponsorBar + both AdSlotStacks) —
// the only place any of the three is rendered from, so gating here is
// enough. Defaults to shown (current behavior) so an unset env var never
// silently switches monetization off; set SHOW_ADS=false to hide them.
const showAds = process.env.SHOW_ADS !== "false";

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const snapshot = await getCitySnapshot(city);
  if (!snapshot) notFound();

  const jobs = await getOpenJobs(city);

  return (
    <CityExplorer
      snapshot={snapshot}
      jobsCount={jobs.length}
      sponsorBar={showAds ? <SponsorBar cityId={city} /> : undefined}
      leftAdSlot={showAds ? <AdSlotStack cityId={city} kind="boost" count={5} /> : undefined}
      rightAdSlot={showAds ? <AdSlotStack cityId={city} kind="flash" count={5} /> : undefined}
      newsPanel={<GeneralNewsList limit={15} />}
    />
  );
}

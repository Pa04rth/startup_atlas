import { notFound } from "next/navigation";
import { getOpenJobs } from "@startup-atlas/db";
import { getCitySnapshot } from "@/lib/snapshot";
import { CityExplorer } from "@/components/CityExplorer";
import { SponsorBar } from "@/components/SponsorBar";
import { AdSlotStack } from "@/components/AdSlotStack";
import { GeneralNewsList } from "@/components/GeneralNewsList";

export const revalidate = 300;

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const snapshot = await getCitySnapshot(city);
  if (!snapshot) notFound();

  const jobs = await getOpenJobs(city);

  return (
    <CityExplorer
      snapshot={snapshot}
      jobsCount={jobs.length}
      sponsorBar={<SponsorBar cityId={city} />}
      leftAdSlot={<AdSlotStack cityId={city} kind="boost" count={5} />}
      rightAdSlot={<AdSlotStack cityId={city} kind="flash" count={5} />}
      newsPanel={<GeneralNewsList limit={15} />}
    />
  );
}

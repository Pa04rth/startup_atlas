import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import { getCachedOpenJobs } from "@/lib/public-data";
import { JobsListClient } from "./JobsListClient";

export default async function JobsPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: cityId } = await params;
  const city = cities.find((c) => c.id === cityId);
  if (!city) notFound();

  const jobs = await getCachedOpenJobs(cityId);

  return <JobsListClient jobs={jobs} cityId={cityId} cityName={city.name} />;
}

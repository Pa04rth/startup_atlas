import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import { getOpenJobs } from "@startup-atlas/db";
import { JobsListClient } from "./JobsListClient";

export default async function JobsPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: cityId } = await params;
  const city = cities.find((c) => c.id === cityId);
  if (!city) notFound();

  const jobs = await getOpenJobs(cityId);

  return <JobsListClient jobs={jobs} cityId={cityId} cityName={city.name} />;
}

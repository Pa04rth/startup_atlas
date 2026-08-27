import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import { getOpenJobs } from "@startup-atlas/db";
import { JobCard } from "@/components/JobCard";

export default async function JobsPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: cityId } = await params;
  const city = cities.find((c) => c.id === cityId);
  if (!city) notFound();

  const jobs = await getOpenJobs(cityId);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-neutral-900">{city.name} jobs &amp; walk-ins</h1>
      <p className="mt-1 text-sm text-neutral-500">{jobs.length} open right now.</p>

      {jobs.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">No open roles yet — check back soon.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} citySlug={cityId} />
          ))}
        </div>
      )}
    </main>
  );
}

import { cities } from "@startup-atlas/config";
import { CityPicker } from "@/components/CityPicker";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight text-neutral-900">Startup Atlas</h1>
      <p className="mt-2 text-neutral-600">
        A city-by-city map of startups — their locations, jobs, walk-in interviews, news, and the
        people who work there.
      </p>
      <div className="mt-10">
        <CityPicker cities={cities} />
      </div>
    </main>
  );
}

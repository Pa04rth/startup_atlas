import Link from "next/link";
import type { CityConfig } from "@startup-atlas/config";

export function CityPicker({ cities }: { cities: CityConfig[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cities.map((city) => (
        <Link
          key={city.id}
          href={`/${city.id}`}
          className="group rounded-xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-900">{city.name}</h2>
            <span className="text-neutral-400 transition group-hover:translate-x-0.5 group-hover:text-neutral-700">
              →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

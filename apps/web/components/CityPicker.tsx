import Image from "next/image";
import Link from "next/link";
import type { CityConfig } from "@startup-atlas/config";

// One representative landmark photo per city, swapped in as the tile
// background. Cities without an entry fall back to a plain gradient tile
// below rather than breaking the layout.
const CITY_IMAGES: Record<string, string> = {
  pune: "/shaniwar-wada-pune.jpg",
  mumbai: "/gateway-india-mumbai.jpg",
};

export function CityPicker({ cities }: { cities: CityConfig[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {cities.map((city) => {
        const image = CITY_IMAGES[city.id];

        return (
          <Link
            key={city.id}
            href={`/${city.id}`}
            className="group relative isolate flex h-56 flex-col justify-end overflow-hidden rounded-2xl border border-neutral-200 shadow-sm transition hover:shadow-lg"
          >
            {image ? (
              <>
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 ease-out group-hover:scale-110"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/0 transition group-hover:from-black/85" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-900" />
            )}

            <div className="relative flex items-center justify-between px-6 py-5">
              <h2 className="text-xl font-semibold text-white drop-shadow-sm">{city.name}</h2>
              <span className="text-white/70 transition group-hover:translate-x-0.5 group-hover:text-white">
                →
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

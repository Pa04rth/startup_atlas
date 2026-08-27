import Link from "next/link";
import { cities } from "@startup-atlas/config";
import { CityPicker } from "@/components/CityPicker";
import { DeveloperCredit } from "@/components/DeveloperCredit";

const TRUST_POINTS = [
  "Every fact sourced & dated",
  "Coordinate precision labelled, never faked",
  "No residential addresses",
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <span className="text-sm font-semibold tracking-tight text-neutral-900">Startup Atlas</span>
        <nav className="flex items-center gap-5 text-sm text-neutral-500">
          <Link href="/submit" className="transition hover:text-neutral-900">
            Submit a startup
          </Link>
          <Link href="/advertise" className="transition hover:text-neutral-900">
            Advertise
          </Link>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-12">
        <p className="text-sm font-medium uppercase tracking-widest text-emerald-600">Pune · Mumbai</p>

        <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
          The map of who&apos;s building what, near you.
        </h1>

        <p className="mt-4 max-w-xl text-base leading-relaxed text-neutral-600 sm:text-lg">
          Startup locations, open roles, walk-in interviews, and the people behind them —
          city by city.
        </p>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-500">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-1.5">
              <span className="text-emerald-600">✓</span>
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <p className="mb-3 text-sm font-medium text-neutral-500">Choose a city to explore</p>
          <CityPicker cities={cities} />
        </div>
      </main>

      <footer className="mx-auto flex w-full max-w-5xl flex-col gap-4 border-t border-neutral-100 px-6 py-6 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
        <span>© {new Date().getFullYear()} Startup Atlas</span>

        <div className="flex items-center gap-2.5">
          <DeveloperCredit avatarSize={28} iconSize={16} />
        </div>

        <div className="flex gap-5">
          <Link href="/privacy" className="transition hover:text-neutral-700">
            Privacy
          </Link>
          <Link href="/terms" className="transition hover:text-neutral-700">
            Terms
          </Link>
        </div>
      </footer>
    </div>
  );
}

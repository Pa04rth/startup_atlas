import type { Metadata } from "next";
import { cities, formatCityNames } from "@startup-atlas/config";
import { ClassicalShell } from "@/components/landing/ClassicalShell";

export const metadata: Metadata = {
  title: "Coming soon — Startup Atlas",
  description: `More cities are being mapped. ${formatCityNames()} are live today.`,
};

// Where the landing page's "Next →" goes (DiptychHero's ChooseCityCard).
// Same classical language as the landing so the jump doesn't feel like it
// left the site — bordered card, Cormorant heading, and the Next button's
// styling mirrored back into a "Back" button.
export default function ComingSoonPage() {
  return (
    <ClassicalShell className="flex min-h-screen flex-col">
      <header className="flex items-baseline justify-between px-[22px] py-[18px] md:px-8 md:py-[22px] lg:px-11 lg:py-[26px]">
        <a
          href="/"
          className="whitespace-nowrap text-[18px] font-normal text-inherit no-underline md:text-[19px] lg:text-[21px]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Startup Atlas
        </a>
        <span className="flex gap-4 text-[11.5px] text-[var(--color-neutral-700)] md:gap-[22px] md:text-[12px] lg:gap-[26px] lg:text-[12.5px]">
          <a
            href="/submit"
            className="whitespace-nowrap text-inherit no-underline transition hover:text-[var(--color-accent-700)]"
          >
            Submit a startup
          </a>
          <a href="/advertise" className="text-inherit no-underline transition hover:text-[var(--color-accent-700)]">
            Advertise
          </a>
        </span>
      </header>

      <main className="flex flex-1 items-center justify-center px-[26px] py-12">
        <div
          className="w-full max-w-[302px] border px-[22px] pb-5 pt-6 text-center md:max-w-[430px] md:px-8 md:pb-7 md:pt-8"
          style={{ background: "var(--color-bg)", borderColor: "var(--color-divider)" }}
        >
          <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent-700)] md:text-[11px] md:tracking-[0.16em]">
            Coming soon
          </div>

          <h1
            className="mt-4 text-[24px] font-normal leading-[1.18] md:text-[31px]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            More cities are being mapped.
          </h1>

          <p className="mt-4 text-[13px] leading-relaxed text-[var(--color-neutral-700)] md:text-sm">
            {formatCityNames()} are live today. The rest of India&apos;s startup
            cities are on the way — sourced, dated, and precision-labelled the same way, one city at
            a time.
          </p>

          <div
            className="mt-5 flex items-center justify-between gap-3 border-t pt-4 md:gap-5"
            style={{ borderColor: "var(--color-divider)" }}
          >
            <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent-700)] md:text-[11px] md:tracking-[0.16em]">
              Live now
            </span>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-sm bg-[var(--color-neutral-900)] py-2.5 pl-3.5 pr-4 text-[12px] tracking-[0.02em] text-[var(--color-neutral-100)] no-underline transition-[background-color,gap] duration-[250ms] hover:gap-3 hover:bg-[var(--color-text)] md:gap-2.5 md:py-[9px] md:pl-4 md:pr-[18px] md:hover:gap-3.5"
            >
              <span className="text-[15px] leading-none">←</span>
              <span>Back</span>
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px]">
            {cities.map((city) => (
              <a
                key={city.id}
                href={`/${city.id}`}
                className="text-[var(--color-accent-700)] no-underline transition hover:underline"
              >
                {city.name} →
              </a>
            ))}
          </div>
        </div>
      </main>
    </ClassicalShell>
  );
}

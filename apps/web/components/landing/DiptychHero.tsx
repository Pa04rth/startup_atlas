"use client";

import type { CityConfig } from "@startup-atlas/config";

// Monument sketch + caption per city — only Pune and Mumbai have hand-drawn
// symbols today (see MonumentSymbols.tsx); a city added without an entry
// here just renders its name, no broken <use> reference.
const MONUMENTS: Record<string, { symbol: string; caption: string }> = {
  pune: { symbol: "m-pune", caption: "Shaniwar Wada" },
  mumbai: { symbol: "m-mumbai", caption: "Gateway of India" },
};

// Replays every ink-draw animation inside the entered half — same effect as
// the first paint, retriggered on hover. cancel() + play() (not just
// restart()) because Safari doesn't support AnimationEffect.updateTiming-
// driven restarts reliably; cancel+play is the version that works
// everywhere the Web Animations API itself does.
function replayInk(e: React.MouseEvent<HTMLAnchorElement>) {
  e.currentTarget.querySelectorAll("use").forEach((use) => {
    use.getAnimations().forEach((anim) => {
      anim.cancel();
      anim.play();
    });
  });
}

// Sizes step through the three widths the design was drawn at: 390 (1f),
// 834 (1e), 1180 (1c). The monument is a normal flow item sitting directly
// on top of the city name rather than absolutely positioned at a fixed
// offset from the bottom — the design's `bottom:126px` is exactly the
// height of the text block beneath it, so stacking them keeps that
// relationship at any viewport height instead of only at the 640px the
// canvas was drawn at.
function CityHalf({ city, isFirst }: { city: CityConfig; isFirst: boolean }) {
  const monument = MONUMENTS[city.id];

  return (
    <a
      href={`/${city.id}`}
      onMouseEnter={replayInk}
      className={
        "relative flex min-h-0 flex-col items-center justify-end overflow-hidden pb-[26px] text-inherit no-underline transition-colors duration-500 hover:bg-[var(--color-accent-100)] md:pb-[34px] lg:pb-[38px] " +
        (isFirst ? "md:border-r md:border-[var(--color-divider)]" : "")
      }
    >
      {monument && (
        <svg
          viewBox="0 0 400 220"
          preserveAspectRatio="xMidYMax meet"
          fill="none"
          className="pointer-events-none w-[min(77%,300px)] shrink-0 text-[var(--color-accent-400)] [stroke-width:1.1] md:w-[min(86%,360px)] lg:w-[min(82%,470px)] lg:[stroke-width:1]"
          aria-hidden="true"
        >
          <use href={`#${monument.symbol}`} className="ink-draw" />
        </svg>
      )}

      <div className="relative text-center">
        <div
          className="font-light leading-none"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="text-[38px] md:text-[46px] lg:text-[64px]">{city.name}</span>
        </div>
        {monument && (
          <div className="mt-2 whitespace-nowrap text-[11px] italic text-[var(--color-neutral-600)] lg:mt-2.5 lg:text-[12px]">
            {monument.caption}
          </div>
        )}
      </div>
    </a>
  );
}

// "Choose a city / Next →" card. Sits in normal flow between the two
// stacked halves on a phone (1f), and floats centered over both of them
// once they're side by side (1e/1c) — where it's pointer-events-none so it
// never steals hover from the half underneath, with the Next button taking
// pointer events back for itself.
function ChooseCityCard() {
  return (
    <div className="flex justify-center px-[26px] md:pointer-events-none md:absolute md:left-1/2 md:top-[34%] md:z-10 md:block md:w-[376px] md:-translate-x-1/2 md:-translate-y-1/2 md:px-0 lg:top-[36%] lg:w-auto lg:max-w-[430px]">
      <div
        className="w-full max-w-[302px] border px-[22px] pb-4 pt-5 text-center md:max-w-none md:px-[26px] md:pb-5 md:pt-6 lg:px-[30px] lg:pb-[22px] lg:pt-[26px]"
        style={{ background: "var(--color-bg)", borderColor: "var(--color-divider)" }}
      >
        <h1
          className="m-0 text-[21px] font-normal leading-[1.22] md:text-[27px] md:leading-[1.18] lg:text-[31px]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Find who&apos;s building what, and where, in your city.
        </h1>

        <div className="mt-3.5 flex items-center justify-between gap-3 border-t pt-3 md:mt-[18px] md:gap-4 md:pt-3.5 lg:mt-5 lg:gap-5 lg:pt-4" style={{ borderColor: "var(--color-divider)" }}>
          <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent-700)] md:text-[10.5px] md:tracking-[0.16em] lg:text-[11px]">
            Choose a city
          </span>
          <a
            href="/coming-soon"
            className="pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-[var(--color-neutral-900)] py-2.5 pl-4 pr-3.5 text-[12px] tracking-[0.02em] text-[var(--color-neutral-100)] no-underline transition-[background-color,gap] duration-[250ms] hover:gap-3 hover:bg-[var(--color-text)] md:gap-[9px] md:py-[9px] md:pl-[17px] md:pr-[15px] md:hover:gap-[13px] lg:gap-2.5 lg:pl-[18px] lg:pr-4 lg:hover:gap-3.5"
          >
            <span>Next</span>
            <span className="text-[15px] leading-none">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

export function DiptychHero({ cities }: { cities: CityConfig[] }) {
  const [first, second] = cities;

  return (
    // Phone: three rows — Pune, the card, Mumbai (1f). Tablet/desktop: two
    // columns with the card and header floating over them (1e/1c). The
    // absolutely-positioned children take no grid slot at md+, so the two
    // halves land in the two columns on their own.
    <div className="relative grid min-h-screen grid-rows-[1fr_auto_1fr] md:grid-cols-2 md:grid-rows-1">
      {first && <CityHalf city={first} isFirst />}
      <ChooseCityCard />
      {second && <CityHalf city={second} isFirst={false} />}

      {/* Header overlay — the two links need real clicks, everything else
          here is decorative, so only they take pointer events back. Sits
          fine above Pune's own content at every width: each half anchors
          its content to the bottom of its row (justify-end), leaving this
          space empty underneath. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-baseline justify-between px-[22px] py-[18px] md:px-8 md:py-[22px] lg:px-11 lg:py-[26px]">
        <span
          className="whitespace-nowrap text-[18px] font-normal md:text-[19px] lg:text-[21px]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Startup Atlas
        </span>
        <span className="pointer-events-auto flex gap-4 text-[11.5px] text-[var(--color-neutral-700)] md:gap-[22px] md:text-[12px] lg:gap-[26px] lg:text-[12.5px]">
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
      </div>
    </div>
  );
}

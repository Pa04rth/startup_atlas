"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CityConfig } from "@startup-atlas/config";

// Monument sketch + caption per city (see MonumentSymbols.tsx). A city added
// without an entry here just renders its name, no broken <use> reference.
const MONUMENTS: Record<string, { symbol: string; caption: string }> = {
  pune: { symbol: "m-pune", caption: "Shaniwar Wada" },
  bengaluru: { symbol: "m-bengaluru", caption: "Bangalore Palace" },
  mumbai: { symbol: "m-mumbai", caption: "Gateway of India" },
};

type Slot = { kind: "city"; city: CityConfig } | { kind: "more" };

// Two halves per page, in config order. An odd city out shares its page
// with the "more cities" plate so every page stays a true diptych.
function paginate(cities: CityConfig[]): Slot[][] {
  const pages: Slot[][] = [];
  for (let i = 0; i < cities.length; i += 2) {
    const page: Slot[] = cities.slice(i, i + 2).map((city) => ({ kind: "city", city }));
    if (page.length === 1) page.push({ kind: "more" });
    pages.push(page);
  }
  return pages;
}

// #page-2, #page-3… — page 1 is the bare URL.
function pageFromHash(hash: string, pageCount: number): number {
  const match = /^#page-(\d+)$/.exec(hash);
  if (!match) return 0;
  const n = Number(match[1]) - 1;
  return n >= 0 && n < pageCount ? n : 0;
}

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

const HALF_CLASS =
  "relative flex min-h-0 flex-col items-center justify-end overflow-hidden pb-[26px] text-inherit no-underline transition-colors duration-500 hover:bg-[var(--color-accent-100)] md:pb-[34px] lg:pb-[38px]";
const MONUMENT_CLASS =
  "pointer-events-none w-[min(77%,300px)] shrink-0 text-[var(--color-accent-400)] [stroke-width:1.1] md:w-[min(86%,360px)] lg:w-[min(82%,470px)] lg:[stroke-width:1]";
const NAME_CLASS = "text-[38px] max-[359px]:text-[32px] md:text-[46px] lg:text-[64px]";
const CAPTION_CLASS =
  "mt-2 whitespace-nowrap text-[11px] italic text-[var(--color-neutral-600)] lg:mt-2.5 lg:text-[12px]";

// Sizes step through the three widths the design was drawn at: 390 (1f/2b),
// 834 (1e), 1180 (1c/2a). The monument is a normal flow item sitting
// directly on top of the city name rather than absolutely positioned at a
// fixed offset from the bottom — the design's `bottom:126px` is exactly the
// height of the text block beneath it, so stacking them keeps that
// relationship at any viewport height instead of only at the 640px the
// canvas was drawn at.
function Half({ slot, isFirst }: { slot: Slot; isFirst: boolean }) {
  const border = isFirst ? " md:border-r md:border-[var(--color-divider)]" : "";

  if (slot.kind === "more") {
    return (
      <a href="/coming-soon" onMouseEnter={replayInk} className={HALF_CLASS + border}>
        <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none" className={MONUMENT_CLASS} aria-hidden="true">
          <use href="#m-more" className="ink-draw" />
        </svg>
        <div className="relative text-center">
          <div className="font-light italic leading-none text-[var(--color-neutral-700)]" style={{ fontFamily: "var(--font-heading)" }}>
            <span className={NAME_CLASS}>More cities</span>
          </div>
          <div className={CAPTION_CLASS}>Being mapped, one at a time</div>
        </div>
      </a>
    );
  }

  const { city } = slot;
  const monument = MONUMENTS[city.id];

  return (
    <a href={`/${city.id}`} onMouseEnter={replayInk} className={HALF_CLASS + border}>
      {monument && (
        <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" fill="none" className={MONUMENT_CLASS} aria-hidden="true">
          <use href={`#${monument.symbol}`} className="ink-draw" />
        </svg>
      )}

      <div className="relative text-center">
        <div className="font-light leading-none" style={{ fontFamily: "var(--font-heading)" }}>
          <span className={NAME_CLASS}>{city.name}</span>
        </div>
        {monument && <div className={CAPTION_CLASS}>{monument.caption}</div>}
      </div>
    </a>
  );
}

const NEXT_BUTTON_CLASS =
  "pointer-events-auto inline-flex items-center gap-2 rounded-sm bg-[var(--color-neutral-900)] py-2.5 pl-4 pr-3.5 text-[12px] tracking-[0.02em] text-[var(--color-neutral-100)] no-underline transition-[background-color,gap] duration-[250ms] hover:gap-3 hover:bg-[var(--color-text)] md:gap-[9px] md:py-[9px] md:pl-[17px] md:pr-[15px] md:hover:gap-[13px] lg:gap-2.5 lg:pl-[18px] lg:pr-4 lg:hover:gap-3.5";
const LABEL_CLASS =
  "whitespace-nowrap text-[10px] uppercase tracking-[0.14em] text-[var(--color-accent-700)] md:text-[10.5px] md:tracking-[0.16em] lg:text-[11px]";

// "Choose a city / Next →" card. Sits in normal flow between the two
// stacked halves on a phone (1f/2b), and floats centered over both of them
// once they're side by side (1e/1c/2a) — where it's pointer-events-none so
// it never steals hover from the half underneath, with the buttons taking
// pointer events back for themselves. Next pages through the cities; on
// the last page it leads to /coming-soon.
function ChooseCityCard({
  page,
  pageCount,
  onNext,
  onBack,
}: {
  page: number;
  pageCount: number;
  onNext: () => void;
  onBack: () => void;
}) {
  const isLast = page === pageCount - 1;
  const nextInner = (
    <>
      <span>Next</span>
      <span className="text-[15px] leading-none" aria-hidden="true">
        →
      </span>
    </>
  );

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

        <div
          className="mt-3.5 flex items-center justify-between gap-3 border-t pt-3 md:mt-[18px] md:gap-4 md:pt-3.5 lg:mt-5 lg:gap-5 lg:pt-4"
          style={{ borderColor: "var(--color-divider)" }}
        >
          {page === 0 ? (
            <span className={LABEL_CLASS}>Choose a city</span>
          ) : (
            <button
              type="button"
              onClick={onBack}
              className={`${LABEL_CLASS} pointer-events-auto -my-2 -ml-1 cursor-pointer border-0 bg-transparent px-1 py-2 transition hover:text-[var(--color-text)]`}
            >
              ← Back
            </button>
          )}

          {pageCount > 1 && (
            <span className="text-[10px] tabular-nums tracking-[0.1em] text-[var(--color-neutral-600)] md:text-[10.5px]" aria-live="polite">
              {page + 1} / {pageCount}
            </span>
          )}

          {isLast ? (
            <a href="/coming-soon" className={NEXT_BUTTON_CLASS} aria-label="More cities coming soon">
              {nextInner}
            </a>
          ) : (
            <button type="button" onClick={onNext} className={`${NEXT_BUTTON_CLASS} cursor-pointer border-0`} aria-label="Show more cities">
              {nextInner}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SWIPE_MIN_PX = 60;

export function DiptychHero({ cities }: { cities: CityConfig[] }) {
  const pages = paginate(cities);
  const pageCount = pages.length;
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Only animate halves in after an actual page change — first paint keeps
  // the design's own entrance (the ink drawing itself in), nothing more.
  const [hasPaged, setHasPaged] = useState(false);
  const pageRef = useRef(0);
  pageRef.current = page;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Deep links and the browser's own back/forward both land here, so a
  // phone's back gesture on page 2 returns to page 1 instead of leaving.
  useEffect(() => {
    const sync = () => {
      const next = pageFromHash(window.location.hash, pageCount);
      if (next === pageRef.current) return;
      setDirection(next > pageRef.current ? 1 : -1);
      setHasPaged(true);
      setPage(next);
    };
    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [pageCount]);

  const goNext = useCallback(() => {
    if (page >= pageCount - 1) return;
    const next = page + 1;
    setDirection(1);
    setHasPaged(true);
    setPage(next);
    window.history.pushState({ diptychPage: next }, "", `#page-${next + 1}`);
  }, [page, pageCount]);

  const goBack = useCallback(() => {
    if (page === 0) return;
    // If we pushed this entry, pop it so history doesn't pile up; on a
    // deep link to #page-2 there's nothing of ours to pop, so replace.
    if (window.history.state?.diptychPage === page) {
      window.history.back();
      return;
    }
    const prev = page - 1;
    setDirection(-1);
    setHasPaged(true);
    setPage(prev);
    const url = prev === 0 ? window.location.pathname + window.location.search : `#page-${prev + 1}`;
    window.history.replaceState(null, "", url);
  }, [page]);

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) goNext();
    else goBack();
  }

  const [first, second] = pages[page] ?? [];

  return (
    // Phone: three rows — first city, the card, second city (1f/2b).
    // Tablet/desktop: two columns with the card and header floating over
    // them (1e/1c/2a). The absolutely-positioned children take no grid slot
    // at md+, so the two halves land in the two columns on their own.
    <div
      className="relative grid min-h-svh grid-rows-[1fr_auto_1fr] md:grid-cols-2 md:grid-rows-1"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Keyed by page so each half remounts on a page change — that's what
          restarts the ink-draw animation, and the enter slide with it. */}
      {first && (
        <div key={`a-${page}`} className={`grid min-h-0${hasPaged ? " diptych-enter" : ""}`} style={{ "--diptych-from": `${direction * 24}px` } as React.CSSProperties}>
          <Half slot={first} isFirst />
        </div>
      )}
      <ChooseCityCard page={page} pageCount={pageCount} onNext={goNext} onBack={goBack} />
      {second && (
        <div key={`b-${page}`} className={`grid min-h-0${hasPaged ? " diptych-enter" : ""}`} style={{ "--diptych-from": `${direction * 24}px` } as React.CSSProperties}>
          <Half slot={second} isFirst={false} />
        </div>
      )}

      {/* Header overlay — the two links need real clicks, everything else
          here is decorative, so only they take pointer events back. Sits
          fine above the first half's own content at every width: each half
          anchors its content to the bottom of its row (justify-end), leaving
          this space empty underneath. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-baseline justify-between gap-3 px-[22px] py-[18px] max-[359px]:px-4 md:px-8 md:py-[22px] lg:px-11 lg:py-[26px]">
        <span
          className="whitespace-nowrap text-[18px] font-normal max-[359px]:text-[16px] md:text-[19px] lg:text-[21px]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Startup Atlas
        </span>
        <span className="pointer-events-auto flex gap-4 text-[11.5px] text-[var(--color-neutral-700)] max-[359px]:gap-3 max-[359px]:text-[11px] md:gap-[22px] md:text-[12px] lg:gap-[26px] lg:text-[12.5px]">
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

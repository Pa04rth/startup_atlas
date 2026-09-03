import { ClassicalShell } from "@/components/landing/ClassicalShell";
import { MonumentSymbols } from "@/components/landing/MonumentSymbols";
import { MonumentWatermark } from "@/components/landing/MonumentWatermark";
import { FormPageHeader } from "@/components/landing/FormPageHeader";
import { AdvertiseForm } from "@/components/forms/AdvertiseForm";

export const metadata = { title: "Advertise — Startup Atlas" };

const FEATURES = [
  { icon: "ic-bolt", text: "Boosted pins, sponsor tiles, flash promos, and banners" },
  { icon: "ic-check", text: "Manually verified before going live — no gateway, just UPI" },
  { icon: "ic-mail", text: "Confirmation by email, usually within a day" },
];

export default function AdvertisePage() {
  return (
    <ClassicalShell className="min-h-screen">
      <MonumentSymbols />
      <FormPageHeader
        right={<span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>A directory for the people building here</span>}
      />

      <div className="relative overflow-hidden">
        <MonumentWatermark
          city="mumbai"
          className="pointer-events-none absolute bottom-0 left-0 hidden h-[420px] w-full sm:block lg:h-[520px]"
        />
        <MonumentWatermark
          city="mumbai"
          className="pointer-events-none absolute right-0 top-4 h-[110px] w-[80%] sm:hidden"
          color="var(--color-neutral-700)"
          opacity={0.35}
        />

        <div className="relative grid gap-8 px-5 pb-10 pt-6 sm:px-8 sm:pb-0 sm:pt-12 lg:grid-cols-2 lg:gap-8 lg:px-10 lg:pb-24 lg:pt-12">
          <div className="lg:pb-10">
            <a href="/" className="back-pill">
              ← Back to the atlas
            </a>

            <div className="sec-lbl mt-5" style={{ color: "var(--color-accent-700)" }}>
              Reach the local ecosystem · 03
            </div>

            <h1
              className="m-0 mt-3.5 text-[28px] font-normal leading-[1.12] sm:text-[36px] lg:text-[46px] lg:leading-[1.08]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Advertise on
              <br />
              Startup Atlas
            </h1>

            <p
              className="mt-3 max-w-[380px] text-[13.5px] leading-relaxed sm:mt-4 sm:text-[15px]"
              style={{ color: "var(--color-neutral-700)" }}
            >
              Put your company or job posting in front of everyone browsing the map.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:gap-4 lg:mt-[26px]">
              {FEATURES.map((f, i) => (
                <div key={f.icon} className={"flex items-start gap-2.5 sm:gap-3" + (i === 2 ? " hidden lg:flex" : "")}>
                  <span className="cf-feature h-5 w-5 text-[11px] sm:h-6 sm:w-6 sm:text-[13px]">
                    <svg width="11" height="11" viewBox="0 0 24 24" className="sm:h-[13px] sm:w-[13px]">
                      <use href={`#${f.icon}`} />
                    </svg>
                  </span>
                  <span className="pt-0.5 text-[12.5px] sm:text-[13.5px]" style={{ color: "var(--color-neutral-800)" }}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="cf-card -mx-5 sm:mx-0 lg:self-start">
            <AdvertiseForm />
          </div>
        </div>
      </div>
    </ClassicalShell>
  );
}

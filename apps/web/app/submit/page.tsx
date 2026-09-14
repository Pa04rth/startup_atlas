import { getAreasByCity } from "@startup-atlas/db";
import { formatCityNames } from "@startup-atlas/config";
import { ClassicalShell } from "@/components/landing/ClassicalShell";
import { MonumentSymbols } from "@/components/landing/MonumentSymbols";
import { MonumentWatermark } from "@/components/landing/MonumentWatermark";
import { FormPageHeader } from "@/components/landing/FormPageHeader";
import { SubmitForm } from "@/components/forms/SubmitForm";

export const metadata = { title: "Submit a company — Startup Atlas" };

const FEATURES = [
  {
    icon: "ic-pin",
    title: `For ${formatCityNames()}`,
    description: "A focused directory of companies with roots in these cities.",
  },
  {
    icon: "ic-check",
    title: "Reviewed by a human",
    description: "Every submission is checked before it is considered for the atlas.",
  },
  {
    icon: "ic-lock",
    title: "Your email stays private",
    description: "We use it for follow-up only. It will never appear on a listing.",
  },
];

export default async function SubmitPage() {
  const areasByCity = await getAreasByCity();

  return (
    <ClassicalShell className="min-h-screen">
      <MonumentSymbols />
      <FormPageHeader
        right={<span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>A directory for the people building here</span>}
      />

      <div className="relative overflow-hidden">
        <MonumentWatermark
          city="pune"
          className="pointer-events-none absolute bottom-0 left-0 hidden h-[420px] w-full sm:block lg:h-[520px]"
        />
        <MonumentWatermark
          city="pune"
          className="pointer-events-none absolute bottom-0 left-[8%] h-[130px] w-[85%] sm:hidden"
          color="var(--color-neutral-700)"
          opacity={0.3}
        />

        <div className="relative grid gap-8 px-5 pb-0 pt-6 sm:px-8 sm:pt-12 lg:grid-cols-[1fr_1.2fr] lg:gap-8 lg:px-10 lg:pb-[90px] lg:pt-12">
          <div className="lg:pb-10">
            <a href="/" className="back-pill">
              ← Back to the atlas
            </a>

            <div className="sec-lbl mt-5" style={{ color: "var(--color-accent-700)" }}>
              Company directory · 01
            </div>

            <h1
              className="m-0 mt-3.5 text-[26px] font-normal leading-[1.14] sm:text-[34px] lg:text-[46px] lg:leading-[1.08]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Put your
              <br className="hidden lg:block" /> company on
              <br className="hidden lg:block" /> the map.
            </h1>

            <p
              className="mt-3 max-w-[340px] text-[13px] leading-relaxed sm:mt-4 sm:text-[15px]"
              style={{ color: "var(--color-neutral-700)" }}
            >
              Help build a more useful, more local view of the people making things in{" "}
              {formatCityNames()}.
            </p>

            <div
              className="mt-6 hidden flex-col gap-4 border-l-2 pl-4 lg:flex"
              style={{ borderColor: "var(--color-accent-300)" }}
            >
              {FEATURES.map((f) => (
                <div key={f.icon}>
                  <div className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--color-neutral-900)" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24">
                      <use href={`#${f.icon}`} />
                    </svg>
                    {f.title}
                  </div>
                  <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--color-neutral-600)" }}>
                    {f.description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cf-card -mx-5 sm:mx-0">
            <SubmitForm areasByCity={areasByCity} />
          </div>
        </div>

        <p
          className="relative px-5 pb-8 pt-6 text-center text-xs sm:px-8 lg:px-10 lg:pb-10"
          style={{ color: "var(--color-neutral-600)" }}
        >
          By submitting, you agree that Startup Atlas may review and publish this company
          information.
        </p>
      </div>
    </ClassicalShell>
  );
}

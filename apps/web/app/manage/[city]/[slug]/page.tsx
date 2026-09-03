import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import { getBrandBySlug } from "@startup-atlas/db";
import { ClassicalShell } from "@/components/landing/ClassicalShell";
import { MonumentSymbols } from "@/components/landing/MonumentSymbols";
import { MonumentWatermark } from "@/components/landing/MonumentWatermark";
import { FormPageHeader } from "@/components/landing/FormPageHeader";
import { ManageCompanyForm } from "@/components/forms/ManageCompanyForm";

type Params = { city: string; slug: string };

const FEATURES = [
  {
    icon: "ic-check",
    title: "Review before publish",
    description: "Your changes are checked by an Atlas editor.",
  },
  {
    icon: "ic-lock",
    title: "Private contact details",
    description: "Your email is never added to the public listing.",
  },
];

export default async function ManageCompanyPage({ params }: { params: Promise<Params> }) {
  const { city: cityId, slug } = await params;
  const city = cities.find((c) => c.id === cityId);
  if (!city) notFound();
  const brand = await getBrandBySlug(cityId, slug);
  if (!brand) notFound();

  return (
    <ClassicalShell className="min-h-screen">
      <MonumentSymbols />
      <FormPageHeader
        right={<span className="text-xs" style={{ color: "var(--color-neutral-600)" }}>A directory for the people building here</span>}
      />

      <div className="relative overflow-hidden">
        <MonumentWatermark
          city={city.id}
          className="pointer-events-none absolute bottom-0 left-0 hidden h-[420px] w-full sm:block lg:h-[520px]"
        />
        <MonumentWatermark
          city={city.id}
          className="pointer-events-none absolute bottom-0 left-[10%] h-[130px] w-[80%] sm:hidden"
          color="var(--color-neutral-700)"
          opacity={0.3}
        />

        <div className="relative grid gap-8 px-5 pb-0 pt-6 sm:px-8 sm:pt-12 lg:grid-cols-2 lg:gap-8 lg:px-10 lg:pb-[60px] lg:pt-12">
          <div className="lg:pb-10">
            <a href={`/${cityId}/company/${slug}`} className="back-pill">
              ← Back to {brand.name}
            </a>

            <div className="sec-lbl mt-5" style={{ color: "var(--color-accent-700)" }}>
              Company directory · 02
            </div>

            <h1
              className="m-0 mt-3.5 text-[26px] font-normal leading-[1.14] sm:text-[34px] lg:text-[46px] lg:leading-[1.08]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Keep your
              <br className="hidden lg:block" /> listing
              <br className="hidden lg:block" /> honest.
            </h1>

            <p
              className="mt-3 max-w-[360px] text-[13px] leading-relaxed sm:mt-4 sm:text-[15px]"
              style={{ color: "var(--color-neutral-700)" }}
            >
              Updates are reviewed before they appear publicly, so the atlas stays useful for
              everyone exploring Pune and Mumbai.
            </p>

            <div className="mt-6 hidden flex-col gap-4 lg:flex">
              {FEATURES.map((f) => (
                <div key={f.icon} className="flex items-start gap-3">
                  <span className="cf-feature">
                    <svg width="13" height="13" viewBox="0 0 24 24">
                      <use href={`#${f.icon}`} />
                    </svg>
                  </span>
                  <div>
                    <div className="text-[13.5px] font-medium" style={{ color: "var(--color-neutral-900)" }}>
                      {f.title}
                    </div>
                    <div className="mt-0.5 text-[12.5px]" style={{ color: "var(--color-neutral-600)" }}>
                      {f.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cf-card -mx-5 sm:mx-0 lg:self-start">
            <ManageCompanyForm
              cityId={cityId}
              brandId={brand.id}
              brandName={brand.name}
              initial={{
                website: brand.website,
                tagline: brand.tagline,
                stage: brand.stage,
                hiring: brand.hiring,
              }}
            />
          </div>
        </div>
      </div>
    </ClassicalShell>
  );
}

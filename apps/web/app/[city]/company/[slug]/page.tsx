import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import {
  getBrandBySlug,
  getPublicContacts,
  getCompanyNews,
  getJobsForBrand,
  getApprovedReferralOffers,
} from "@startup-atlas/db";
import { ClassicalShell } from "@/components/landing/ClassicalShell";
import { MonumentSymbols } from "@/components/landing/MonumentSymbols";
import { MonumentWatermark } from "@/components/landing/MonumentWatermark";
import { FormPageHeader } from "@/components/landing/FormPageHeader";
import { PrecisionBadge } from "@/components/PrecisionBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ContactsList } from "@/components/ContactsList";
import { NewsPanel } from "@/components/NewsPanel";
import { JobsPanel } from "@/components/JobsPanel";
import { CompanyLogo } from "@/components/CompanyLogo";
import { ReferralSection } from "@/components/ReferralSection";

type Params = { city: string; slug: string };

// Fetched directly from Postgres, not the snapshot — profiles need to be
// fresher than the cached snapshot, and this is where SEO crawlers land.
async function loadBrand(params: Params) {
  const city = cities.find((c) => c.id === params.city);
  if (!city) return null;
  const brand = await getBrandBySlug(params.city, params.slug);
  if (!brand) return null;
  return { city, brand };
}

// export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
//   const data = await loadBrand(await params);
//   if (!data) return {};
//   const { brand, city } = data;
//   return {
//     title: `${brand.name} — ${city.name} | Startup Atlas`,
//     description: brand.tagline ?? brand.description ?? `${brand.name} in ${city.name}.`,
//   };
// }

export default async function CompanyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const data = await loadBrand(await params);
  if (!data) notFound();
  const { brand, city } = data;

  const [contacts, news, jobs, referralOffers] = await Promise.all([
    getPublicContacts(brand.id),
    getCompanyNews(brand.id),
    getJobsForBrand(brand.id),
    getApprovedReferralOffers(brand.id),
  ]);

  const manageHref = `/manage/${city.id}/${brand.slug}`;

  return (
    <ClassicalShell className="min-h-screen">
      <MonumentSymbols />
      <FormPageHeader
        right={
          <a href={manageHref} className="cf-secondary">
            Manage Company Page
          </a>
        }
      />

      <div className="relative overflow-hidden pt-6 sm:pt-14">
        <MonumentWatermark
          city={city.id}
          className="pointer-events-none absolute bottom-0 left-0 hidden h-[420px] w-full sm:block lg:h-[520px]"
        />
        <MonumentWatermark
          city={city.id}
          className="pointer-events-none absolute right-0 top-0 h-[120px] w-[65%] sm:hidden"
          color="var(--color-neutral-700)"
          opacity={0.3}
        />

        <div className="relative mx-auto max-w-[900px] px-5 pb-10 sm:px-8 sm:pb-16">
          <a href={`/${city.id}`} className="back-pill">
            ← Back to map
          </a>

          <div className="cf-card mt-5 sm:mt-7">
            {/* Header: avatar, name, tagline, chips, manage-company action */}
            <div className="border-b p-5 sm:flex sm:gap-4 sm:p-9" style={{ borderColor: "var(--color-divider)" }}>
              <CompanyLogo src={brand.logoUrl} name={brand.name} className="h-9 w-9 shrink-0 rounded-sm sm:h-11 sm:w-11" />
              <div className="mt-3 sm:mt-0 sm:flex-1">
                <div className="sm:flex sm:items-baseline sm:justify-between sm:gap-4">
                  <h1
                    className="m-0 text-[22px] font-semibold sm:text-[30px]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {brand.name}
                  </h1>
                  <a href={manageHref} className="cf-secondary mt-3 hidden sm:mt-0 sm:inline-flex">
                    Manage Company Page
                  </a>
                </div>
                {brand.tagline && (
                  <p className="mt-1 text-[12px] sm:text-[13.5px]" style={{ color: "var(--color-neutral-600)" }}>
                    {brand.tagline}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:mt-3">
                  {brand.hiring && (
                    <span
                      className="chip"
                      style={{ borderColor: "var(--color-accent-300)", color: "var(--color-accent-700)" }}
                    >
                      Hiring
                    </span>
                  )}
                  {brand.sector && <span className="chip">{brand.sector}</span>}
                  {brand.stage && <span className="chip">{brand.stage}</span>}
                  <PrecisionBadge precision={brand.precision} />
                  <VerifiedBadge lastVerifiedAt={brand.lastVerifiedAt} />
                </div>
                <a href={manageHref} className="cf-secondary mt-3.5 block text-center sm:hidden">
                  Manage Company Page
                </a>
              </div>
            </div>

            {/* Description + website + location */}
            {(brand.description || brand.website || brand.area) && (
              <div className="border-b p-5 sm:p-9" style={{ borderColor: "var(--color-divider)" }}>
                {brand.description && (
                  <p
                    className="m-0 max-w-[640px] text-[13px] leading-relaxed sm:text-[14.5px]"
                    style={{ color: "var(--color-neutral-800)" }}
                  >
                    {brand.description}
                  </p>
                )}
                <div className="mt-3 flex flex-col gap-1.5 text-[12.5px] sm:mt-4 sm:flex-row sm:items-center sm:gap-5 sm:text-[13px]">
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="no-underline"
                      style={{ color: "var(--color-accent-700)" }}
                    >
                      Website ↗
                    </a>
                  )}
                  {brand.area && (
                    <span className="inline-flex items-center gap-1.5" style={{ color: "var(--color-neutral-600)" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24">
                        <use href="#ic-pin" />
                      </svg>
                      {brand.area}, {city.name}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Get referred / Open roles */}
            <div
              className="grid grid-cols-1 border-b sm:grid-cols-2"
              style={{ borderColor: "var(--color-divider)" }}
            >
              <div
                className="border-b p-5 sm:border-b-0 sm:border-r sm:p-9"
                style={{ borderColor: "var(--color-divider)" }}
              >
                <ReferralSection cityId={city.id} brandSlug={brand.slug} brandName={brand.name} offers={referralOffers} jobs={jobs} />
              </div>
              <div className="p-5 sm:p-9">
                {jobs.length === 0 ? (
                  <>
                    <h3 className="m-0 flex items-center gap-2 text-[15px] sm:text-base">
                      <svg width="14" height="14" viewBox="0 0 24 24">
                        <use href="#ic-case" />
                      </svg>
                      Open roles
                    </h3>
                    <p className="mt-2.5 text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
                      No verified roles listed right now.
                    </p>
                    <a href={manageHref} className="mt-1.5 inline-block text-[12.5px] no-underline" style={{ color: "var(--color-accent-700)" }}>
                      Suggest a role ↗
                    </a>
                  </>
                ) : (
                  <JobsPanel jobs={jobs} cityName={city.name} brandName={brand.name} citySlug={city.id} />
                )}
              </div>
            </div>

            {contacts.length > 0 && (
              <div className="border-b p-5 sm:p-9" style={{ borderColor: "var(--color-divider)" }}>
                <ContactsList contacts={contacts} />
              </div>
            )}

            {news.length > 0 && (
              <div className="border-b p-5 sm:p-9" style={{ borderColor: "var(--color-divider)" }}>
                <NewsPanel articles={news} />
              </div>
            )}

            {/* Suggest an edit */}
            <div className="p-5 sm:p-9">
              <h3
                className="m-0 flex items-center gap-2 text-[13px] sm:text-sm"
                style={{ color: "var(--color-neutral-900)" }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24">
                  <use href="#ic-chat" />
                </svg>
                Know something we should update?
              </h3>
              <p className="mt-2 text-[12.5px] sm:mt-2 sm:text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
                Help keep this page accurate by suggesting a change.
              </p>
              <a href={manageHref} className="cf-secondary mt-3.5 inline-flex">
                Suggest an edit
              </a>
            </div>
          </div>
        </div>
      </div>
    </ClassicalShell>
  );
}

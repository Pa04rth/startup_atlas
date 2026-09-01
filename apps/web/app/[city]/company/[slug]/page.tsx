import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import {
  getBrandBySlug,
  getPublicContacts,
  getCompanyNews,
  getJobsForBrand,
} from "@startup-atlas/db";
import { PrecisionBadge } from "@/components/PrecisionBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ContactsList } from "@/components/ContactsList";
import { NewsPanel } from "@/components/NewsPanel";
import { JobsPanel } from "@/components/JobsPanel";
import { CompanyLogo } from "@/components/CompanyLogo";

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

  const [contacts, news, jobs] = await Promise.all([
    getPublicContacts(brand.id),
    getCompanyNews(brand.id),
    getJobsForBrand(brand.id),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href={`/${city.id}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900"
      >
        ← Back to map
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <CompanyLogo
            src={brand.logoUrl}
            name={brand.name}
            className="mt-1 h-10 w-10 shrink-0 rounded"
          />
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">
              {brand.name}
            </h1>
            {brand.tagline && (
              <p className="mt-1 text-neutral-600">{brand.tagline}</p>
            )}
          </div>
        </div>
        {brand.hiring && (
          <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
            Hiring
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {brand.sector && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
            {brand.sector}
          </span>
        )}
        {brand.stage && (
          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600">
            {brand.stage}
          </span>
        )}
        <PrecisionBadge precision={brand.precision} />
        <VerifiedBadge lastVerifiedAt={brand.lastVerifiedAt} />
      </div>

      {brand.description && (
        <p className="mt-6 text-neutral-700">{brand.description}</p>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        {brand.website && (
          <a
            href={brand.website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-700 hover:underline"
          >
            Website →
          </a>
        )}
        {brand.area && (
          <span className="text-neutral-500">
            {brand.area}, {city.name}
          </span>
        )}
      </div>

      <div className="mt-10 space-y-8">
        <JobsPanel jobs={jobs} cityName={city.name} brandName={brand.name} />
        <ContactsList contacts={contacts} />
        <NewsPanel articles={news} />
      </div>
    </main>
  );
}

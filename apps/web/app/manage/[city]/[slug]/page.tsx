import { notFound } from "next/navigation";
import { cities } from "@startup-atlas/config";
import { getBrandBySlug } from "@startup-atlas/db";
import { ManageCompanyForm } from "@/components/forms/ManageCompanyForm";

type Params = { city: string; slug: string };

export default async function ManageCompanyPage({ params }: { params: Promise<Params> }) {
  const { city: cityId, slug } = await params;
  const city = cities.find((c) => c.id === cityId);
  if (!city) notFound();
  const brand = await getBrandBySlug(cityId, slug);
  if (!brand) notFound();

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <a href={`/${cityId}/company/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 hover:text-neutral-900">
        ← Back to {brand.name}
      </a>

      <h1 className="mt-4 text-2xl font-bold text-neutral-900">Manage this listing</h1>
      <p className="mt-1.5 text-sm text-neutral-500">
        Anyone can suggest changes to a company&apos;s public listing — every edit goes through admin
        review before it goes live, same as a new submission.
      </p>

      <div className="mt-6">
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
    </main>
  );
}

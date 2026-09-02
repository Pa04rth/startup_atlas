import { notFound } from "next/navigation";
import { getBrandForAdmin } from "@startup-atlas/db";
import { updateBrand, approveBrand, archiveBrand } from "@/lib/admin/actions";
import { cardClass, mutedText, inputClass as themedInputClass, buttonPrimaryClass, buttonGhostClass, StatusPill } from "../../_theme";

export default async function BrandEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await getBrandForAdmin(id);
  if (!brand) notFound();

  const inputClass = `mt-1 w-full ${themedInputClass}`;
  const labelClass = `block text-xs font-medium uppercase tracking-wide ${mutedText}`;

  return (
    <div>
      <a href="/admin/brands" className={`text-sm ${mutedText} hover:text-white`}>
        ← Back to brands
      </a>

      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">{brand.name}</h1>
        <div className="flex items-center gap-2">
          <StatusPill value={brand.status} />
          <span className={`text-xs ${mutedText}`}>score {brand.score}</span>
          <form action={approveBrand.bind(null, brand.id)}>
            <button type="submit" className={buttonPrimaryClass}>
              Publish now
            </button>
          </form>
          <form action={archiveBrand.bind(null, brand.id)}>
            <button type="submit" className={buttonGhostClass}>
              Archive
            </button>
          </form>
        </div>
      </div>
      <p className={`mt-1 text-xs ${mutedText}`}>
        {brand.cityId} / {brand.slug} — location: {brand.precision ?? "none"}
        {brand.area ? `, ${brand.area}` : ""}
        {brand.address ? ` (${brand.address})` : ""}. Location isn&apos;t editable here — re-run geocoding via the
        pipeline if it&apos;s wrong.
      </p>

      <form action={updateBrand.bind(null, brand.id)} className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 ${cardClass}`}>
        <div>
          <label className={labelClass}>Name</label>
          <input name="name" defaultValue={brand.name} required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Kind</label>
          <select name="kind" defaultValue={brand.kind} className={inputClass}>
            <option value="startup">startup</option>
            <option value="vc">vc</option>
            <option value="mnc">mnc</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Tagline</label>
          <input name="tagline" defaultValue={brand.tagline ?? ""} className={inputClass} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Description</label>
          <textarea name="description" defaultValue={brand.description ?? ""} rows={3} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Sector</label>
          <input name="sector" defaultValue={brand.sector ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Stage</label>
          <input name="stage" defaultValue={brand.stage ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Website</label>
          <input name="website" type="url" defaultValue={brand.website ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Domain (auto-derived if blank)</label>
          <input name="domain" defaultValue={brand.domain ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Founded year</label>
          <input name="foundedYear" type="number" defaultValue={brand.foundedYear ?? ""} className={inputClass} />
        </div>
        <label className="mt-6 flex items-center gap-2 text-sm text-[#c3c2b7]">
          <input type="checkbox" name="hiring" defaultChecked={brand.hiring} className="h-4 w-4 accent-[#3987e5]" />
          Currently hiring
        </label>

        <div className="sm:col-span-2">
          <button type="submit" className={buttonPrimaryClass}>
            Save — re-scores from these fields
          </button>
        </div>
      </form>
    </div>
  );
}

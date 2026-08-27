import { getBrandsByStatus } from "@startup-atlas/db";
import { approveBrand, archiveBrand } from "@/lib/admin/actions";

export default async function ReviewQueuePage() {
  const brands = await getBrandsByStatus("review");

  return (
    <div>
      <h1 className="text-xl font-bold text-neutral-900">Review queue</h1>
      <p className="mt-1 text-sm text-neutral-500">{brands.length} brands waiting for a decision.</p>

      <div className="mt-4 space-y-2">
        {brands.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-neutral-900">{b.name}</p>
              <p className="text-xs text-neutral-500">
                {b.cityId} · score {b.score} · {b.precision ?? "no location"}
                {b.website ? ` · ${b.website}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <form action={approveBrand.bind(null, b.id)}>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
              </form>
              <form action={archiveBrand.bind(null, b.id)}>
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Archive
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

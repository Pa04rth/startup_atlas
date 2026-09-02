"use client";

import { useMemo, useState, useTransition } from "react";
import type { AdminBrandRow } from "@startup-atlas/db";
import { approveBrand, archiveBrand, approveBrands, archiveBrands } from "@/lib/admin/actions";

export default function ReviewQueueClient({ brands }: { brands: AdminBrandRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const allIds = useMemo(() => brands.map((b) => b.id), [brands]);
  const allSelected = selected.size > 0 && selected.size === allIds.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function bulkApprove() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await approveBrands(ids);
      setSelected(new Set());
    });
  }

  function bulkArchive() {
    const ids = Array.from(selected);
    startTransition(async () => {
      await archiveBrands(ids);
      setSelected(new Set());
    });
  }

  return (
    <div>
      <div className="mt-4 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={brands.length === 0}
            className="h-4 w-4"
          />
          Select all ({brands.length})
        </label>
        <span className="text-sm text-neutral-500">{selected.size} selected</span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={bulkApprove}
            disabled={selected.size === 0 || isPending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve selected
          </button>
          <button
            type="button"
            onClick={bulkArchive}
            disabled={selected.size === 0 || isPending}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Archive selected
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {brands.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <input
                type="checkbox"
                checked={selected.has(b.id)}
                onChange={() => toggleOne(b.id)}
                className="h-4 w-4 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{b.name}</p>
                <p className="text-xs text-neutral-500">
                  {b.cityId} · score {b.score} · {b.precision ?? "no location"}
                  {b.website ? ` · ${b.website}` : ""}
                </p>
              </div>
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

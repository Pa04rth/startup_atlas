"use client";

import { useState, useTransition } from "react";
import { triggerIngest } from "@/lib/admin/actions";
import { cities, type CityId } from "@startup-atlas/config";
import { buttonPrimaryClass } from "../_theme";

const OPTIONS: Array<{ label: string; city: "" | CityId }> = [
  ...cities.map((c) => ({ label: `Run ${c.name}`, city: c.id })),
  { label: "Run all", city: "" },
];

export default function IngestClient() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function run(city: "" | CityId) {
    setMessage(null);
    startTransition(async () => {
      try {
        await triggerIngest(city);
        setMessage({ kind: "ok", text: "Queued — check the Actions tab in a few seconds." });
      } catch (err) {
        setMessage({ kind: "error", text: err instanceof Error ? err.message : "Failed to queue." });
      }
    });
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.city}
            type="button"
            disabled={isPending}
            onClick={() => run(o.city)}
            className={buttonPrimaryClass}
          >
            {isPending ? "Queuing…" : o.label}
          </button>
        ))}
      </div>
      {message && (
        <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-[#157a15]" : "text-[#b3402c]"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

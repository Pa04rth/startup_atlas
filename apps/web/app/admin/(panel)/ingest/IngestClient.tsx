"use client";

import { useState, useTransition } from "react";
import { triggerIngest } from "@/lib/admin/actions";
import { buttonPrimaryClass } from "../_theme";

const OPTIONS: Array<{ label: string; city: "" | "pune" | "mumbai" }> = [
  { label: "Run Pune", city: "pune" },
  { label: "Run Mumbai", city: "mumbai" },
  { label: "Run both", city: "" },
];

export default function IngestClient() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  function run(city: "" | "pune" | "mumbai") {
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
      <div className="flex gap-2">
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
        <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-[#3ddc3d]" : "text-[#e46b6b]"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { PaymentQR } from "@/components/PaymentQR";

type Kind = "ad_booking" | "subscription" | "connect_request" | "referral_request";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const labelClass = "block text-sm font-medium text-neutral-800";

export function PaymentVerificationForm({
  kind,
  referenceId,
  amountInr,
}: {
  kind: Kind;
  referenceId: string;
  amountInr: number;
}) {
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = new FormData(e.currentTarget);
    // Honeypot, same pattern as SubmitForm.
    if (form.get("website")) {
      setStatus("done");
      return;
    }

    const res = await fetch("/api/payment-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        referenceId,
        amountInr,
        payerName: form.get("payerName") || undefined,
        payerContact: form.get("payerContact"),
        transactionId: form.get("transactionId"),
        honeypot: form.get("website") || "",
      }),
    });

    if (res.ok) {
      setStatus("done");
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong — try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-lg">✓</div>
        <p className="mt-3 text-sm font-medium text-emerald-900">
          Got it — we'll verify the payment and confirm by email, usually within a day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <PaymentQR amountInr={amountInr} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px]"
          aria-hidden="true"
        />

        <div>
          <label className={labelClass}>Your name</label>
          <input name="payerName" placeholder="Optional" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Email or phone *</label>
          <input name="payerContact" required placeholder="you@company.com" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>UPI transaction ID (UTR) *</label>
          <input
            name="transactionId"
            required
            placeholder="12-digit reference number from your UPI app"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
        )}

        <button
          type="submit"
          disabled={status === "submitting"}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "submitting" ? "Submitting…" : "I've paid — submit"}
        </button>
      </form>
    </div>
  );
}

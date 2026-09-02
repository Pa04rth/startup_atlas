"use client";

import { useState } from "react";
import { PaymentQR } from "@/components/PaymentQR";
import { inputClass, labelClass, primaryButtonClass, errorClass, successCardClass } from "./ui";

type Kind = "ad_booking" | "subscription" | "connect_request" | "referral_request";

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
      <div className={successCardClass}>
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-lg text-emerald-700">✓</div>
        <p className="mt-3 text-sm font-medium text-emerald-900">
          Got it — we'll verify the payment and confirm by email, usually within a day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)] sm:p-8">
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

        {error && <p className={errorClass}>{error}</p>}

        <button type="submit" disabled={status === "submitting"} className={primaryButtonClass}>
          {status === "submitting" ? "Submitting…" : "I've paid — submit"}
        </button>
      </form>
    </div>
  );
}

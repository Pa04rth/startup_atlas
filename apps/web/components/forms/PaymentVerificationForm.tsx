"use client";

import { useState } from "react";
import { PaymentQR } from "@/components/PaymentQR";

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
      <div className="px-6 py-10 text-center sm:px-8">
        <div
          className="mx-auto flex h-11 w-11 items-center justify-center rounded-full text-lg"
          style={{ background: "var(--color-accent-100)", color: "var(--color-accent-700)" }}
        >
          ✓
        </div>
        <p className="mt-4 text-sm font-medium">
          Got it — we&apos;ll verify the payment and confirm by email, usually within a day.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
      <PaymentQR amountInr={amountInr} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          className="absolute left-[-9999px]"
          aria-hidden="true"
        />

        <div>
          <label className="fl">Your name</label>
          <input name="payerName" placeholder="Optional" />
        </div>

        <div>
          <label className="fl">
            Email or phone <span className="req">*</span>
          </label>
          <input name="payerContact" required placeholder="you@company.com" />
        </div>

        <div>
          <label className="fl">
            UPI transaction ID (UTR) <span className="req">*</span>
          </label>
          <input name="transactionId" required placeholder="12-digit reference number from your UPI app" />
        </div>

        {error && (
          <p className="rounded-sm border px-3.5 py-2.5 text-sm" style={{ borderColor: "#b3543f", color: "#b3543f" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={status === "submitting"} className="cf-primary">
          {status === "submitting" ? "Submitting…" : "I've paid — submit"}
        </button>
      </form>
    </div>
  );
}

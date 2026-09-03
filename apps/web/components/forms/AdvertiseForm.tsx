"use client";

import { useState } from "react";
import { cities, AD_PRICING, AD_LABELS } from "@startup-atlas/config";
import { PaymentVerificationForm } from "./PaymentVerificationForm";

export function AdvertiseForm() {
  const [booking, setBooking] = useState<{
    id: number;
    amountInr: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    if (form.get("website")) {
      setLoading(false);
      return;
    }

    const kind = String(form.get("kind"));
    const res = await fetch("/api/advertise", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cityId: form.get("cityId"),
        kind,
        contactEmail: form.get("contactEmail"),
        honeypot: form.get("website") || "",
      }),
    });

    setLoading(false);
    if (res.ok) {
      const body = await res.json();
      setBooking({ id: body.id, amountInr: AD_PRICING[kind] });
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong — try again.");
    }
  }

  if (booking) {
    return (
      <PaymentVerificationForm
        kind="ad_booking"
        referenceId={String(booking.id)}
        amountInr={booking.amountInr}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <div className="border-b px-6 py-5 sm:px-8 sm:py-[26px]" style={{ borderColor: "var(--color-divider)" }}>
        <h2 className="m-0 text-xl font-semibold sm:text-2xl">Reserve a spot</h2>
        <p className="mt-2 text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
          Choose a city and placement. We&apos;ll email payment instructions after review.
        </p>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6 sm:px-8">
        <div>
          <label className="fl">City</label>
          <select name="cityId" required>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="fl">Ad type</label>
          <select name="kind" required>
            {Object.entries(AD_LABELS).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="fl">
            Contact email <span className="req">*</span>
          </label>
          <input name="contactEmail" type="email" required placeholder="you@company.com" />
        </div>

        {error && (
          <p className="rounded-sm border px-3.5 py-2.5 text-sm" style={{ borderColor: "#b3543f", color: "#b3543f" }}>
            {error}
          </p>
        )}

        <p className="m-0 text-xs" style={{ color: "var(--color-neutral-600)" }}>
          After booking, you will receive an email with payment instructions. Once payment is
          confirmed, your ad will go live.
        </p>

        <button type="submit" disabled={loading} className="cf-primary">
          {loading ? "Booking…" : "Book — pay next step →"}
        </button>
      </div>
    </form>
  );
}

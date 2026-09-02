"use client";

import { useState } from "react";
import { cities, AD_PRICING, AD_LABELS } from "@startup-atlas/config";
import { PaymentVerificationForm } from "./PaymentVerificationForm";
import { cardClass, inputClass, labelClass, primaryButtonClass, errorClass } from "./ui";

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
    <form onSubmit={handleSubmit} className={cardClass}>
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px]"
        aria-hidden="true"
      />

      <div>
        <label className={labelClass}>City</label>
        <select name="cityId" required className={inputClass}>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Ad type</label>
        <select name="kind" required className={inputClass}>
          {Object.entries(AD_LABELS).map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Contact email *</label>
        <input
          name="contactEmail"
          type="email"
          required
          placeholder="you@company.com"
          className={inputClass}
        />
      </div>

      {error && <p className={errorClass}>{error}</p>}
      <div>
        <p className="text-sm text-neutral-600">
          After booking, you will receive an email with payment instructions.
          Once the payment is confirmed, your ad will go live.
        </p>
      </div>

      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? "Booking…" : "Book — pay next step"}
      </button>
    </form>
  );
}

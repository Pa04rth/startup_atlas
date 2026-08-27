"use client";

import { useState } from "react";
import { cities, AD_PRICING, AD_LABELS } from "@startup-atlas/config";
import { PaymentVerificationForm } from "./PaymentVerificationForm";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 shadow-sm " +
  "transition placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const labelClass = "block text-sm font-medium text-neutral-800";

export function AdvertiseForm() {
  const [booking, setBooking] = useState<{ id: number; amountInr: number } | null>(null);
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
      <PaymentVerificationForm kind="ad_booking" referenceId={String(booking.id)} amountInr={booking.amountInr} />
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
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
        <input name="contactEmail" type="email" required placeholder="you@company.com" className={inputClass} />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Booking…" : "Book — pay next step"}
      </button>
    </form>
  );
}

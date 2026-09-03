"use client";

import { useState } from "react";

// Drop your real UPI QR export at apps/web/public/upi-qr.png — until then
// this falls back to a placeholder so the flow is demo-able immediately.
export function PaymentQR({ amountInr }: { amountInr: number }) {
  const [src, setSrc] = useState("/upi-qr.jpeg");

  return (
    <div
      className="rounded-sm border p-5 text-center"
      style={{ borderColor: "var(--color-divider)", background: "var(--color-bg)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        onError={() => setSrc("/upi-qr-placeholder.svg")}
        alt="UPI QR code"
        className="mx-auto h-48 w-48 rounded-sm border bg-white object-contain p-2"
        style={{ borderColor: "var(--color-divider)" }}
      />
      <p className="mt-3 text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
        ₹{amountInr.toLocaleString("en-IN")}
      </p>
      <p className="mt-1 text-[13px]" style={{ color: "var(--color-neutral-600)" }}>
        Scan with any UPI app, pay the amount above, then fill in the transaction ID below.
      </p>
    </div>
  );
}

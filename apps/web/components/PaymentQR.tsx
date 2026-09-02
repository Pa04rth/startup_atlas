"use client";

import { useState } from "react";

// Drop your real UPI QR export at apps/web/public/upi-qr.png — until then
// this falls back to a placeholder so the flow is demo-able immediately.
export function PaymentQR({ amountInr }: { amountInr: number }) {
  const [src, setSrc] = useState("/upi-qr.jpeg");

  return (
    <div className="rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white p-5 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        onError={() => setSrc("/upi-qr-placeholder.svg")}
        alt="UPI QR code"
        className="mx-auto h-48 w-48 rounded-lg border border-neutral-200 bg-white object-contain p-2 shadow-sm"
      />
      <p className="mt-3 text-2xl font-bold text-neutral-900">
        ₹{amountInr.toLocaleString("en-IN")}
      </p>
      <p className="mt-1 text-sm text-neutral-600">
        Scan with any UPI app, pay the amount above, then fill in the
        transaction ID below.
      </p>
    </div>
  );
}

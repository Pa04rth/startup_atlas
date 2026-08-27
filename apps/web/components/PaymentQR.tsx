"use client";

import { useState } from "react";

// Drop your real UPI QR export at apps/web/public/upi-qr.png — until then
// this falls back to a placeholder so the flow is demo-able immediately.
export function PaymentQR({ amountInr }: { amountInr: number }) {
  const [src, setSrc] = useState("/upi-qr.png");

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        onError={() => setSrc("/upi-qr-placeholder.svg")}
        alt="UPI QR code"
        className="mx-auto h-48 w-48 object-contain"
      />
      <p className="mt-3 text-lg font-semibold text-neutral-900">₹{amountInr.toLocaleString("en-IN")}</p>
      <p className="mt-1 text-sm text-neutral-600">
        Scan with any UPI app, pay the amount above, then fill in the transaction ID below.
      </p>
    </div>
  );
}

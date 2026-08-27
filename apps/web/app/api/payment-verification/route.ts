import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdBookingAmount, insertPaymentVerification } from "@startup-atlas/db";

const schema = z.object({
  kind: z.enum(["ad_booking", "subscription", "connect_request"]),
  referenceId: z.string().trim().min(1).max(100),
  payerName: z.string().trim().max(200).optional().or(z.literal("")),
  payerContact: z.string().trim().min(1).max(200),
  transactionId: z.string().trim().min(1).max(100),
  honeypot: z.string().max(0),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;

  // The amount is always looked up server-side from the referenced row —
  // never trust a client-supplied amount on anything payment-adjacent.
  let amountInr: number | null = null;
  if (data.kind === "ad_booking") {
    const id = Number(data.referenceId);
    if (!Number.isInteger(id)) {
      return NextResponse.json({ error: "Invalid reference." }, { status: 400 });
    }
    amountInr = await getAdBookingAmount(id);
  } else {
    // subscriptions/connect_requests don't exist yet (later phases) — see
    // packages/db/queries/payments.ts's approveVerification for the same gate.
    return NextResponse.json({ error: `"${data.kind}" isn't supported yet.` }, { status: 400 });
  }

  if (amountInr == null) {
    return NextResponse.json({ error: "Could not find that booking." }, { status: 404 });
  }

  const { id } = await insertPaymentVerification({
    kind: data.kind,
    referenceId: data.referenceId,
    amountInr,
    payerName: data.payerName || null,
    payerContact: data.payerContact,
    transactionId: data.transactionId,
  });

  return NextResponse.json({ ok: true, id });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { createReferralRequest, getReferralOfferById } from "@startup-atlas/db";

const schema = z.object({
  offerId: z.number().int().positive(),
  candidateName: z.string().trim().min(1).max(200),
  candidateEmail: z.string().trim().email().max(200),
  candidatePhone: z.string().trim().max(50).optional().or(z.literal("")),
  resumeUrl: z.string().trim().url().max(500).optional().or(z.literal("")),
  honeypot: z.string().max(0),
});

// Only an *approved* offer can be requested against — an offer still
// pending admin review was never shown to a candidate in the first place,
// but re-check server-side rather than trust that the UI enforced it.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;

  const offer = await getReferralOfferById(data.offerId);
  if (!offer || offer.status !== "approved") {
    return NextResponse.json({ error: "This referral offer isn't available." }, { status: 404 });
  }

  const { id } = await createReferralRequest({
    offerId: data.offerId,
    candidateName: data.candidateName,
    candidateEmail: data.candidateEmail,
    candidatePhone: data.candidatePhone || null,
    resumeUrl: data.resumeUrl || null,
  });

  return NextResponse.json({ ok: true, id });
}

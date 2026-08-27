import { NextResponse } from "next/server";
import { z } from "zod";
import { cities, AD_PRICING } from "@startup-atlas/config";
import { createAdBooking } from "@startup-atlas/db";

const CITY_IDS = cities.map((c) => c.id) as [string, ...string[]];
const AD_KINDS = Object.keys(AD_PRICING) as [string, ...string[]];

const schema = z.object({
  cityId: z.enum(CITY_IDS),
  kind: z.enum(AD_KINDS),
  contactEmail: z.string().trim().email().max(200),
  honeypot: z.string().max(0),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;

  // Price is always looked up server-side from AD_PRICING — never trust a
  // client-supplied amount for anything payment-adjacent.
  const amountInr = AD_PRICING[data.kind];

  const { id } = await createAdBooking({
    cityId: data.cityId,
    kind: data.kind as "banner" | "boost" | "flash" | "featured",
    amountInr,
    contactEmail: data.contactEmail,
  });

  return NextResponse.json({ ok: true, id });
}

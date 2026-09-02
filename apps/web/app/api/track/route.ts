import { NextResponse } from "next/server";
import { z } from "zod";
import { insertPageView } from "@startup-atlas/db";

const schema = z.object({
  path: z.string().trim().min(1).max(500),
  cityId: z.string().trim().max(50).optional().or(z.literal("")),
  referrer: z.string().trim().max(500).optional().or(z.literal("")),
});

// Fire-and-forget first-party pageview logging (see lib/analytics.ts) —
// never blocks rendering, never throws back to the caller in a way that
// would show up as a broken page; a bad beacon just doesn't get counted.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const data = parsed.data;
  await insertPageView({
    path: data.path,
    cityId: data.cityId || null,
    referrer: data.referrer || null,
  });
  return NextResponse.json({ ok: true });
}

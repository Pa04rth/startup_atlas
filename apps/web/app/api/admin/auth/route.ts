import { NextResponse } from "next/server";
import {
  checkPassword,
  createSessionCookieValue,
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/admin/auth";
import { isRateLimited, recordAttempt, clearAttempts } from "@/lib/admin/rate-limit";

export async function POST(request: Request) {
  // Best-effort client identifier for rate limiting — trust the platform's
  // forwarded IP when present (Vercel sets this), fall back to a shared
  // bucket otherwise rather than skip limiting entirely.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Too many attempts — try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!checkPassword(password)) {
    recordAttempt(ip);
    // Same response shape regardless of why it failed — no hints for guessing.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  clearAttempts(ip);
  const value = await createSessionCookieValue();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE_NAME);
  return res;
}

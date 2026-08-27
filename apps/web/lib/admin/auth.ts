// Stateless admin session: an HMAC-signed cookie, no sessions table. Written
// with the Web Crypto API (not node:crypto) on purpose — middleware.ts runs
// on the Edge runtime, which doesn't have node:crypto, and this file is
// shared between middleware and route handlers.
export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12h

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

async function getKey(): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(getSecret());
  return crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return toHex(sig);
}

// Constant-time-ish string compare — avoids leaking an early mismatch via
// a fast return, without needing node:crypto's timingSafeEqual.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a dummy pass so the *length* mismatch case doesn't return
    // dramatically faster than a same-length mismatch.
    let dummy = 0;
    for (let i = 0; i < a.length; i++) dummy |= a.charCodeAt(i);
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Single shared admin password, checked against ADMIN_SESSION_SECRET. This
// is deliberately simple — one trusted operator, not a multi-user system.
// Upgrade to real per-user auth before this is ever a multi-admin product.
export function checkPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_SESSION_SECRET;
  if (!expected) return false;
  return constantTimeEqual(candidate, expected);
}

export async function createSessionCookieValue(): Promise<string> {
  const expiresAt = Date.now() + ADMIN_COOKIE_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  const sig = await sign(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionCookieValue(value: string | undefined | null): Promise<boolean> {
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig) return false;

  const expectedSig = await sign(payload);
  if (!constantTimeEqual(sig, expectedSig)) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}

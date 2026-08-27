// In-memory sliding-window limiter for the admin login endpoint. Deliberately
// simple: this only works correctly for a single Node process (a dev server,
// or a traditional `next start` deployment) — it does NOT share state across
// serverless instances. If apps/web ever moves to serverless/edge with
// multiple concurrent instances, replace this with a shared store (Redis,
// Vercel KV) before relying on it. Good enough for a single-operator admin
// panel today; flagged so it isn't mistaken for production-grade later.
const attempts = new Map<string, number[]>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function recordAttempt(key: string): void {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

// First-party pageview beacon — see api/track/route.ts and
// packages/db/queries/admin.ts's page_views functions. Uses
// navigator.sendBeacon when available (survives the tab closing/navigating
// away, unlike a regular fetch which can get cancelled mid-flight) and
// falls back to fetch with keepalive for browsers/environments without it.
export function track(path: string) {
  if (typeof window === "undefined") return;
  const cityId = path.split("/").filter(Boolean)[0] || "";
  const body = JSON.stringify({ path, cityId, referrer: document.referrer || "" });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(
    () => {}
  );
}

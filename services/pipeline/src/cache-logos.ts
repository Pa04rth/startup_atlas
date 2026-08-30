// Fetch-once-and-cache pass over every brand with a known domain — run
// after any batch of new brands lands (the demo seed, or a real ingestion
// run) to replace live favicon hotlinks with locally-cached files.
//   pnpm --filter services-pipeline run cache-logos
import { getPool } from "@startup-atlas/db";
import { fetchAndCacheLogo } from "./lib/logos";
import { withRetry } from "./lib/retry";

async function main() {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; domain: string }>(
    `select id, domain from brands where domain is not null`
  );

  const cache = new Map<string, string | null>(); // domain -> public path (or null = no logo found)
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!cache.has(row.domain)) {
      const path = await fetchAndCacheLogo(row.domain);
      cache.set(row.domain, path);
      console.log(path ? `[ok] ${row.domain} -> ${path}` : `[skip] ${row.domain} (no logo found)`);
    }

    const path = cache.get(row.domain);
    // Explicitly null on a miss, not left alone — this is what actually
    // retires the live-hotlink era: any brand this script has touched ends
    // up with either a real cached file or a clean null (CompanyLogo.tsx's
    // initials-avatar fallback), never a stale external URL that could
    // silently start failing again later the way the last three did.
    // withRetry (not just a bare query) because this loop runs ~800 writes
    // sequentially over one connection — the first backfill run died to a
    // single dropped connection near the end, losing all progress on the
    // remaining rows for no reason better than a transient network blip.
    await withRetry(() => pool.query(`update brands set logo_url = $2 where id = $1`, [row.id, path]));
    if (path) updated++;
    else skipped++;
  }

  console.log(`\nDone: ${updated} brands updated, ${skipped} skipped (${cache.size} unique domains).`);
  await pool.end();
}

main().catch((err) => {
  console.error("[cache-logos] fatal error", err);
  process.exit(1);
});

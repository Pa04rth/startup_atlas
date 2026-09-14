// Entry point for the aggregator-jobs refresh (Adzuna + Jooble).
//   pnpm --filter services-pipeline run refresh-aggregator-jobs <city>
//
// Needs ADZUNA_APP_ID/ADZUNA_APP_KEY and/or JOOBLE_API_KEY in .env — with
// neither set this exits cleanly having done nothing, so it's safe to wire
// into cron before the keys exist.
import { getPool } from "@startup-atlas/db";
import { cities } from "@startup-atlas/config";
import { refreshAggregatorJobs } from "./steps/refresh_aggregator_jobs";

const cityId = process.argv[2];

if (!cityId) {
  console.error("Usage: tsx src/refresh-aggregator-jobs.ts <city>");
  process.exit(1);
}

async function main() {
  const city = cities.find((c) => c.id === cityId);
  if (!city) {
    console.error(`[aggregator-jobs] unknown city "${cityId}"`);
    process.exit(1);
  }

  if (!process.env.ADZUNA_APP_ID && !process.env.JOOBLE_API_KEY) {
    console.log("[aggregator-jobs] no ADZUNA_APP_ID or JOOBLE_API_KEY set — nothing to do.");
    await getPool().end();
    return;
  }

  console.log(`[aggregator-jobs] fetching listings for ${city.name}...`);
  const result = await refreshAggregatorJobs(city.id, city.jobsLocation ?? city.name);

  console.log(
    `[aggregator-jobs] done: fetched=${result.fetched} ` +
      `(adzuna=${result.sources.adzuna} jooble=${result.sources.jooble}) ` +
      `matched=${result.matched} upserted=${result.upserted}`
  );
  if (result.fetched > 0 && result.matched === 0) {
    console.log("[aggregator-jobs] nothing matched a brand on the map — see the sample below.");
  }
  if (result.unmatchedSample.length > 0) {
    console.log(`[aggregator-jobs] unmatched employers (sample): ${result.unmatchedSample.join(", ")}`);
  }

  await getPool().end();
}

main().catch((err) => {
  console.error("[aggregator-jobs] fatal error", err);
  process.exit(1);
});

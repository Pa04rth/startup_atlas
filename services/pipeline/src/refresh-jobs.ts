// Entry point for the jobs-refresh maintenance job (CLAUDE.md §12, phase 2).
//   pnpm --filter services-pipeline run refresh-jobs <city>
import { getPool } from "@startup-atlas/db";
import { refreshJobs } from "./steps/refresh_jobs";

const city = process.argv[2];

if (!city) {
  console.error("Usage: tsx src/refresh-jobs.ts <city>");
  process.exit(1);
}

async function main() {
  console.log(`[refresh-jobs] checking brands' own career pages for city="${city}"...`);
  const { brandsChecked, found, upserted } = await refreshJobs(city);
  console.log(`[refresh-jobs] done: brandsChecked=${brandsChecked} found=${found} upserted=${upserted}`);

  await getPool().end();
}

main().catch((err) => {
  console.error("[refresh-jobs] fatal error", err);
  process.exit(1);
});

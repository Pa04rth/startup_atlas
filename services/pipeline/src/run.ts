// Entry point for the ingestion pipeline. Run on the ingestion laptop:
//   pnpm --filter services-pipeline tsx src/run.ts <city>
//
// Wires: sources/* -> normalize -> dedupe -> enrich_llm -> geocode ->
// verify_score -> upsert, once per registered collector, logging each run
// to ingestion_runs so the admin panel (later) can show ingest health.
import { getPool } from "@startup-atlas/db";
import { collectorsForCity } from "./sources";
import { dedupe } from "./steps/dedupe";
import { enrichLlm } from "./steps/enrich_llm";
import { geocode } from "./steps/geocode";
import { normalize } from "./steps/normalize";
import { upsert } from "./steps/upsert";
import { verifyScore } from "./steps/verify_score";

const city = process.argv[2];

if (!city) {
  console.error("Usage: tsx src/run.ts <city>");
  process.exit(1);
}

async function main() {
  const pool = getPool();
  const collectors = collectorsForCity(city);

  if (collectors.length === 0) {
    console.warn(`[pipeline] no sources registered for city="${city}" (see src/sources/index.ts)`);
  }

  for (const collector of collectors) {
    const startedAt = new Date();
    console.log(`[pipeline] ${collector.name} -> collecting`);

    let found = 0;
    let upserted = 0;
    let needsReview = 0;
    let notes: string | null = null;

    try {
      const raw = await collector.run();
      found = raw.length;

      const normalized = normalize(raw);
      const deduped = dedupe(normalized);
      const enriched = await enrichLlm(deduped);
      const geocoded = await geocode(enriched, city);
      const scored = verifyScore(geocoded);
      needsReview = scored.filter((r) => r.status === "review").length;

      const result = await upsert(scored, city);
      upserted = result.upserted;

      console.log(
        `[pipeline] ${collector.name} done: found=${found} upserted=${upserted} needsReview=${needsReview}`
      );
    } catch (err) {
      notes = err instanceof Error ? err.message : String(err);
      console.error(`[pipeline] ${collector.name} FAILED: ${notes}`);
    }

    await pool.query(
      `INSERT INTO ingestion_runs (city_id, source, started_at, finished_at, found, upserted, needs_review, notes)
       VALUES ($1,$2,$3,now(),$4,$5,$6,$7)`,
      [city, collector.name, startedAt, found, upserted, needsReview, notes]
    );
  }

  await pool.end();
}

main().catch((err) => {
  console.error("[pipeline] fatal error", err);
  process.exit(1);
});

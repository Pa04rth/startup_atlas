// Entry point for the ingestion pipeline. Run on the ingestion laptop:
//   pnpm --filter services-pipeline tsx src/run.ts <city>
//
// Pipeline stages (to be implemented under sources/* and steps/*):
//   sources/*        one collector per free source, returns raw records
//   steps/normalize  shape raw records into a common schema
//   steps/dedupe     collapse duplicates across sources
//   steps/enrich_llm free/local LLM description + sector/stage classification
//   steps/geocode    Nominatim + honest precision fallback
//   steps/verify_score  score 0-100, assign review_status tier
//   steps/upsert     write into Postgres
//   steps/reindex_search  (v2, Typesense)

const city = process.argv[2];

if (!city) {
  console.error("Usage: tsx src/run.ts <city>");
  process.exit(1);
}

async function main() {
  console.log(`[pipeline] starting run for city=${city}`);
  // TODO: wire sources -> normalize -> dedupe -> enrich_llm -> geocode -> verify_score -> upsert
}

main().catch((err) => {
  console.error("[pipeline] fatal error", err);
  process.exit(1);
});

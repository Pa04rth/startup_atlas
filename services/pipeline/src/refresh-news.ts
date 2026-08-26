// Entry point for the news-refresh maintenance job (CLAUDE.md §12, phase 2).
// Separate from run.ts on purpose — this doesn't discover brands, it only
// links existing ones to news coverage, so it has nothing to do with the
// normalize/dedupe/geocode/verify_score/upsert chain in run.ts.
//   pnpm --filter services-pipeline run refresh-news <city>
import { getPool } from "@startup-atlas/db";
import { collectNewsArticles } from "./sources/news_rss";
import { refreshNews } from "./steps/refresh_news";

const city = process.argv[2];

if (!city) {
  console.error("Usage: tsx src/refresh-news.ts <city>");
  process.exit(1);
}

async function main() {
  console.log("[refresh-news] fetching feeds...");
  const articles = await collectNewsArticles();
  console.log(`[refresh-news] fetched ${articles.length} articles, matching against city="${city}"...`);

  const { stored, linked } = await refreshNews(city, articles);
  console.log(`[refresh-news] done: stored=${stored} linked=${linked}`);

  await getPool().end();
}

main().catch((err) => {
  console.error("[refresh-news] fatal error", err);
  process.exit(1);
});

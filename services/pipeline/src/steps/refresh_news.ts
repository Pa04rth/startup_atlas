// Maintenance-phase step (CLAUDE.md §12: "news = refresh_news RSS", meant
// to move to a daily cron once past backfill). Two jobs: 1) store every
// article seen (news_articles, unique on url) 2) link it to an existing
// published/probable brand whose name appears in the title.
//
// The match is a plain lower-cased substring check, not NLP — good enough
// for 3 days and it can only link to brands that already passed
// verify_score, so a bad match never creates or upgrades a brand, it just
// mislinks a news card at worst.
import { getPool } from "@startup-atlas/db";
import type { NewsItem } from "../types";

// Strip common legal-entity suffixes before matching — press coverage
// almost never uses the full registered name ("Call X Ringers Private
// Limited"), it uses the brand name alone ("Call X Ringers"). Still a plain
// substring check, not NLP; this just widens what "the brand name" means
// for matching purposes, it doesn't loosen the requirement that the
// (normalized) name actually appear in the title.
const LEGAL_SUFFIX = /\s+(pvt\.?\s*ltd\.?|private\s+limited|llp|inc\.?|technologies|solutions)\s*$/i;
function normalizeName(name: string): string {
  return name.replace(LEGAL_SUFFIX, "").trim().toLowerCase();
}

export async function refreshNews(
  cityId: string,
  articles: NewsItem[]
): Promise<{ stored: number; linked: number }> {
  const pool = getPool();
  let stored = 0;
  let linked = 0;

  const { rows: brands } = await pool.query(
    `select id, name from brands where city_id = $1 and status in ('published','probable')`,
    [cityId]
  );

  for (const article of articles) {
    const inserted = await pool.query(
      `insert into news_articles (title, url, source, published_at)
       values ($1,$2,$3,$4)
       on conflict (url) do nothing
       returning id`,
      [article.title, article.url, article.source, article.publishedAt]
    );

    let articleId: number | undefined = inserted.rows[0]?.id;
    if (articleId) {
      stored++;
    } else {
      const existing = await pool.query(`select id from news_articles where url = $1`, [article.url]);
      articleId = existing.rows[0]?.id;
    }
    if (!articleId) continue;

    const titleLower = article.title.toLowerCase();
    const match = brands.find((b) => {
      const normalized = normalizeName(b.name as string);
      return normalized.length > 2 && titleLower.includes(normalized);
    });
    if (!match) continue;

    const linkRes = await pool.query(
      `insert into company_news (brand_id, article_id) values ($1,$2) on conflict do nothing returning brand_id`,
      [match.id, articleId]
    );
    if (linkRes.rows.length > 0) linked++;
  }

  return { stored, linked };
}

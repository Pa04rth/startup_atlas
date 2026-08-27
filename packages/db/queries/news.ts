import { getPool } from "../index";

export type CompanyNewsItem = {
  id: number;
  title: string;
  url: string;
  source: string | null;
  publishedAt: string | null;
};

// Not company-linked or city-scoped — news_articles carries no city_id
// (it's national/global tech press, not something we can honestly claim is
// "Pune news"). Used for a general "Startup & tech news" panel, kept
// visually and textually distinct from the per-company NewsPanel so it
// never reads as a claim about a specific listed company.
export async function getRecentNews(limit: number): Promise<CompanyNewsItem[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, title, url, source, published_at
     from news_articles
     order by published_at desc nulls last, id desc
     limit $1`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    publishedAt: r.published_at,
  }));
}

export async function getCompanyNews(brandId: string): Promise<CompanyNewsItem[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select a.id, a.title, a.url, a.source, a.published_at
     from company_news cn
     join news_articles a on a.id = cn.article_id
     where cn.brand_id = $1
     order by a.published_at desc nulls last`,
    [brandId]
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    url: r.url,
    source: r.source,
    publishedAt: r.published_at,
  }));
}

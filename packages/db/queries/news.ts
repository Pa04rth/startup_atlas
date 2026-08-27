import { getPool } from "../index";

export type CompanyNewsItem = {
  id: number;
  title: string;
  url: string;
  source: string | null;
  publishedAt: string | null;
};

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

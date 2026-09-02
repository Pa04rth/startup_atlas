import { getRecentNews } from "@startup-atlas/db";
import { NewsPanelClient } from "./NewsPanelClient";

// General industry news, not tied to any one listed company — deliberately
// separate from NewsPanel (which only ever shows articles a title-match
// actually linked to a specific brand) so this never reads as a claim that
// a headline is "about" a company on this map. Fetches one batch server-side
// (a server component can't paginate itself against a click), then hands it
// to a client component that pages through it 5-at-a-time — no server
// round-trip per page, same in-memory-filter philosophy as the map's search.
export async function GeneralNewsList({ limit }: { limit: number }) {
  const articles = await getRecentNews(limit);
  if (articles.length === 0) return null;

  return <NewsPanelClient articles={articles} pageSize={5} />;
}

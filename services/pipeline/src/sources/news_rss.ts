// Fetches & parses free RSS feeds (Inc42, YourStory, Entrackr). Returns raw
// articles only — no brand matching here, see steps/refresh_news.ts for
// that. Matching stays separate because a headline is not a sourced fact
// about a company: treating article text as a new brand risks inventing
// companies from noisy text, which is exactly what CLAUDE.md's "never fake
// a fact" rule forbids. This file's only job is "did we see this article."
import Parser from "rss-parser";
import type { NewsItem } from "../types";

const parser = new Parser();

// Add more feeds here as you find them — each entry is independent, one
// feed going down (a redirect, a dead URL) doesn't break the others.
const FEEDS: Array<{ url: string; source: string }> = [
  { url: "https://inc42.com/feed/", source: "Inc42" },
  { url: "https://yourstory.com/feed", source: "YourStory" },
  { url: "https://entrackr.com/feed", source: "Entrackr" },
];

export async function collectNewsArticles(): Promise<NewsItem[]> {
  const items: NewsItem[] = [];

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const entry of parsed.items) {
        if (!entry.title || !entry.link) continue;
        items.push({
          title: entry.title.trim(),
          url: entry.link.trim(),
          source: feed.source,
          publishedAt: entry.isoDate ?? entry.pubDate ?? null,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[news_rss] ${feed.source} failed: ${message}`);
    }
  }

  return items;
}

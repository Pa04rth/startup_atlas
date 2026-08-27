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
  { url: "https://entrackr.com/rss", source: "Entrackr" }, // /feed 404s as of 2026-08 — Entrackr moved it
  // hnrss.org is a well-known free RSS proxy over Hacker News' own API (no
  // official HN RSS exists) — same rss-parser path as every other feed
  // here, no new dependency. Query scoped to "startup" to keep it on-topic
  // rather than pulling in all of HN's general tech firehose.
  { url: "https://hnrss.org/newest?q=startup&search_attrs=title", source: "Hacker News" },
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

import type { MetadataRoute } from "next";
import { getAllPublishedSlugs } from "@startup-atlas/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const slugs = await getAllPublishedSlugs();

  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    ...slugs.map((s) => ({
      url: `${base}/${s.cityId}/company/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}

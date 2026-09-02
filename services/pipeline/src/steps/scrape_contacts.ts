// Maintenance-phase step, same shape as refresh_jobs.ts: re-checks every
// published/probable brand's own website for public mailto: contacts and
// upserts company_contacts. Weekly cadence (not daily like jobs/news) —
// a company's published contact addresses change far less often than its
// open roles, and this makes 3-5 requests per brand vs. refresh_jobs'
// 2, so it's the heavier of the two maintenance walks.
import { getPool, upsertCompanyContact } from "@startup-atlas/db";
import { scrapeCompanyContacts } from "../lib/contacts";

const REQUEST_DELAY_MS = 500; // politeness spacing between brands (heavier per-brand: up to 5 page fetches)

export async function scrapeContacts(
  cityId: string
): Promise<{ brandsChecked: number; found: number; upserted: number }> {
  const pool = getPool();
  const { rows: brands } = await pool.query<{ id: string; website: string }>(
    `select id, website from brands
     where city_id = $1 and status in ('published','probable') and website is not null`,
    [cityId]
  );

  let found = 0;
  let upserted = 0;

  for (const brand of brands) {
    const contacts = await scrapeCompanyContacts(brand.website);
    found += contacts.length;
    for (const contact of contacts) {
      await upsertCompanyContact({
        brandId: brand.id,
        type: contact.type,
        email: contact.email,
        sourceUrl: contact.sourceUrl,
      });
      upserted++;
    }
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  return { brandsChecked: brands.length, found, upserted };
}

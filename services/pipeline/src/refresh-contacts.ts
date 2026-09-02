// Entry point for the contacts-refresh maintenance job (Phase 7's
// "company_site.ts" gap — see steps/scrape_contacts.ts).
//   pnpm --filter services-pipeline run refresh-contacts <city>
import { getPool } from "@startup-atlas/db";
import { scrapeContacts } from "./steps/scrape_contacts";

const city = process.argv[2];

if (!city) {
  console.error("Usage: tsx src/refresh-contacts.ts <city>");
  process.exit(1);
}

async function main() {
  console.log(`[refresh-contacts] checking brands' own websites for city="${city}"...`);
  const { brandsChecked, found, upserted } = await scrapeContacts(city);
  console.log(`[refresh-contacts] done: brandsChecked=${brandsChecked} found=${found} upserted=${upserted}`);

  await getPool().end();
}

main().catch((err) => {
  console.error("[refresh-contacts] fatal error", err);
  process.exit(1);
});

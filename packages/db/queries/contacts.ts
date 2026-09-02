import { getPool } from "../index";

export type CompanyContact = {
  id: number;
  type: "hr" | "careers" | "leadership" | "general";
  email: string | null;
  url: string | null;
  sourceUrl: string;
  verifiedAt: string | null;
};

// `is_public = true AND opted_out = false` is the whole DPDP-compliance
// story for this table — never drop this predicate, even for admin views
// (admin should see opted_out rows explicitly, via a separate query, not
// this one).
export async function getPublicContacts(brandId: string): Promise<CompanyContact[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `select id, type, email, url, source_url, verified_at
     from company_contacts
     where brand_id = $1 and is_public = true and opted_out = false
     order by type asc`,
    [brandId]
  );
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    email: r.email,
    url: r.url,
    sourceUrl: r.source_url,
    verifiedAt: r.verified_at,
  }));
}

// Written by services/pipeline/src/steps/scrape_contacts.ts. Re-run safe
// via the (brand_id, type, coalesce(email,'')) unique index (migration
// 0007) — a weekly re-scrape upserts the same rows instead of piling up
// duplicates; source_url always required, matching the schema's own
// provenance rule (no source_url, no publish).
export async function upsertCompanyContact(input: {
  brandId: string;
  type: "hr" | "careers" | "leadership" | "general";
  email?: string | null;
  url?: string | null;
  sourceUrl: string;
}): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into company_contacts (brand_id, type, email, url, is_public, source_url, verified_at)
     values ($1,$2,$3,$4,true,$5,now())
     on conflict (brand_id, type, coalesce(email, ''))
     do update set url = excluded.url, source_url = excluded.source_url, verified_at = now()
     where company_contacts.opted_out = false`,
    [input.brandId, input.type, input.email ?? null, input.url ?? null, input.sourceUrl]
  );
}

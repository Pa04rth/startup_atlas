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

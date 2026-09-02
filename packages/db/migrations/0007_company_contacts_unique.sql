-- Lets services/pipeline/src/steps/scrape_contacts.ts (Phase 7's
-- "company_site.ts" gap — this is what actually populates the free HR/
-- careers contact directory at scale, the incubator/Wellfound sources
-- alone never touch company_contacts) re-run safely: same brand+type+email
-- upserts instead of piling up duplicate rows on every weekly refresh.
-- COALESCE(email,'') so a url-only contact (email null) still gets a
-- stable key instead of every NULL comparing distinct from every other.
CREATE UNIQUE INDEX IF NOT EXISTS company_contacts_brand_type_email_key
  ON company_contacts (brand_id, type, coalesce(email, ''));

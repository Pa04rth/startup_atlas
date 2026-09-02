-- Distinguishes a brand-new-company submission from an edit request against
-- an existing brand (the public "Manage company" flow) — both land in the
-- same submissions/review queue, admin just needs to know which one it is
-- and, for an edit, which brand it targets.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'new';
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS target_brand_id UUID REFERENCES brands(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS submissions_target_brand_idx ON submissions(target_brand_id);

-- steps/refresh_jobs.ts (services/pipeline) upserts job postings fetched
-- from a company's ATS (Greenhouse/Lever) on every daily run — apply_url is
-- the natural identity of a listing (Postgres UNIQUE allows multiple NULLs,
-- so rows without one, if any ever land, aren't affected).
CREATE UNIQUE INDEX IF NOT EXISTS job_postings_apply_url_key ON job_postings(apply_url);

-- Adds an "mnc" company kind, distinct from "startup" and "vc": a real,
-- verifiably-present large multinational (e.g. Google, Amazon, Tech
-- Mahindra) with a genuine local office, but not a local-founded startup.
-- Never used to hide a location mismatch — that's still archived; this is
-- for companies confirmed to actually be here, just not a startup.
ALTER TYPE company_kind ADD VALUE IF NOT EXISTS 'mnc';

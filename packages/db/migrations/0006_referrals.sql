-- Paid referral system (per the user spec, not a CLAUDE.md-sketched
-- feature): anyone claiming to work at a company can post a referral offer
-- against one of its jobs; a candidate pays ₹100 (same manual QR + admin-
-- verified pattern as every other paid surface — see payment_verifications)
-- to be referred, ₹80 goes to the referrer, ₹20 to the platform. Fraud
-- control is admin review of a non-government-ID "proof of employment"
-- upload (company badge, laptop showing an internal tool with the company
-- name visible, a payslip with the amount blacked out, etc.) before an
-- offer ever goes public — never automated, never a hard identity check.

CREATE TYPE referral_offer_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TABLE referral_offers (
  id BIGSERIAL PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  job_posting_id BIGINT REFERENCES job_postings(id) ON DELETE SET NULL,
  job_title TEXT NOT NULL, -- freeform label shown to candidates even if job_posting_id is null (role not in job_postings, or since expired)
  referrer_name TEXT NOT NULL,
  referrer_email TEXT NOT NULL, -- ideally a work email matching the brand's domain; admin cross-checks, not enforced by the DB
  referrer_role TEXT,
  referrer_linkedin TEXT,
  proof_url TEXT NOT NULL, -- R2-hosted, NOT a government ID — see app copy on the offer form
  proof_note TEXT, -- what the image shows, in the referrer's own words
  pitch TEXT, -- shown to candidates on the (approved) offer
  status referral_offer_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX referral_offers_brand_idx ON referral_offers(brand_id);
CREATE INDEX referral_offers_status_idx ON referral_offers(status);

CREATE TYPE referral_request_status AS ENUM ('requested', 'paid', 'fulfilled', 'released', 'refunded', 'rejected');
CREATE TABLE referral_requests (
  id BIGSERIAL PRIMARY KEY,
  offer_id BIGINT NOT NULL REFERENCES referral_offers(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_phone TEXT,
  resume_url TEXT,
  status referral_request_status NOT NULL DEFAULT 'requested',
  fee_inr INT NOT NULL DEFAULT 100,
  referrer_cut_inr INT NOT NULL DEFAULT 80,
  platform_cut_inr INT NOT NULL DEFAULT 20,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX referral_requests_offer_idx ON referral_requests(offer_id);
CREATE INDEX referral_requests_status_idx ON referral_requests(status);

-- Reuses the exact same manual-QR-verification queue every other paid
-- surface uses (ads today; subscriptions/connect were already sketched for
-- it) — a referral payment is just a fourth `kind`.
ALTER TYPE payment_verification_kind ADD VALUE IF NOT EXISTS 'referral_request';

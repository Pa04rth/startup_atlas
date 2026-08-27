-- Manual payment verification — the ONE mechanism for every paid surface
-- (ads, recruiter subscriptions, paid connect). No payment gateway: the
-- payer scans a QR code shown on the site, pays via their own UPI app, then
-- submits the transaction id here. Nothing goes live/active until a human
-- approves it in the admin dashboard. Needed starting Phase 5 (ads) — run
-- this before that phase, not a v2/later migration.

CREATE TYPE payment_verification_kind   AS ENUM ('ad_booking','subscription','connect_request');
CREATE TYPE payment_verification_status AS ENUM ('pending','approved','rejected');

CREATE TABLE payment_verifications (
  id BIGSERIAL PRIMARY KEY,
  kind payment_verification_kind NOT NULL,
  reference_id TEXT NOT NULL,        -- id of the ad_bookings/subscriptions/connect_requests row
  amount_inr INT NOT NULL,
  payer_name TEXT,
  payer_contact TEXT NOT NULL,       -- email or phone — how you reach them if it doesn't check out
  transaction_id TEXT NOT NULL,      -- the UPI/UTR reference number they typed in
  screenshot_url TEXT,               -- optional proof upload
  status payment_verification_status DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  notes TEXT,                        -- admin's rejection reason, if any
  created_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX payment_verifications_status_idx   ON payment_verifications(status);
CREATE INDEX payment_verifications_kind_ref_idx ON payment_verifications(kind, reference_id);

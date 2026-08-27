-- Recruiter subscriptions (CLAUDE.md FR-11, v2). Not part of the original
-- schema.sql snapshot — run this after the base schema is live, at Phase 8.
-- Payment is manual QR + payment_verifications (see 0000_payment_verifications.sql)
-- — no payment-gateway fields here on purpose.

CREATE TABLE recruiters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now());

CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','cancelled');

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES recruiters(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  status subscription_status DEFAULT 'trialing',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX subscriptions_recruiter_idx ON subscriptions(recruiter_id);
CREATE INDEX subscriptions_status_idx    ON subscriptions(status);

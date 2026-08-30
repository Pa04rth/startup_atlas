-- Startup Atlas — core schema. Run once against a fresh Postgres+PostGIS DB.
-- Source of truth: CLAUDE.md section 5.

-- extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- reference ------------------------------------------------------
CREATE TABLE cities (
  id TEXT PRIMARY KEY,                 -- 'pune','mumbai'
  name TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'Maharashtra',
  center_lat DOUBLE PRECISION, center_lng DOUBLE PRECISION,
  bbox geometry(Polygon,4326), default_zoom INT DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now());

CREATE TABLE areas (                    -- centroids for synthetic pins
  id BIGSERIAL PRIMARY KEY, city_id TEXT REFERENCES cities(id),
  name TEXT NOT NULL, centroid geometry(Point,4326) NOT NULL,
  UNIQUE(city_id,name));

-- public brand layer --------------------------------------------
CREATE TYPE company_kind  AS ENUM ('startup','vc','mnc');
CREATE TYPE lifecycle     AS ENUM ('active','acquired','public','closed','unknown');
CREATE TYPE loc_precision AS ENUM ('exact','building','street','locality','area','city','synthetic');
CREATE TYPE review_status AS ENUM ('published','probable','review','archived');

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id TEXT NOT NULL REFERENCES cities(id),
  slug TEXT NOT NULL, name TEXT NOT NULL,
  kind company_kind DEFAULT 'startup',
  tagline TEXT, description TEXT, sector TEXT, stage TEXT,
  tags TEXT[] DEFAULT '{}', website TEXT, domain TEXT,
  founded_year INT, lifecycle lifecycle DEFAULT 'unknown',
  hiring BOOLEAN DEFAULT false, logo_url TEXT,
  score INT DEFAULT 0, status review_status DEFAULT 'review',
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(city_id,slug));
CREATE INDEX brands_city_status_idx ON brands(city_id,status);
CREATE INDEX brands_domain_idx      ON brands(domain);
CREATE INDEX brands_name_trgm_idx   ON brands USING gin(name gin_trgm_ops);

-- legal entity layer (verification only) -------------------------
CREATE TABLE legal_entities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legal_name TEXT NOT NULL, cin TEXT UNIQUE, incorp_date DATE,
  reg_state TEXT, mca_status TEXT, evidence_url TEXT);
CREATE TYPE brand_relation AS ENUM
  ('operated_by','brand_of','subsidiary_of','formerly_known_as','acquired_by');
CREATE TABLE brand_entity_links (
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  entity_id UUID REFERENCES legal_entities(id) ON DELETE CASCADE,
  relation brand_relation NOT NULL, evidence_url TEXT,
  PRIMARY KEY(brand_id,entity_id,relation));

-- geography (the workhorse) --------------------------------------
CREATE TABLE offices (
  id BIGSERIAL PRIMARY KEY, brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  city_id TEXT REFERENCES cities(id),
  geom geometry(Point,4326) NOT NULL,
  precision loc_precision DEFAULT 'synthetic',
  area TEXT, address TEXT, is_public_office BOOLEAN DEFAULT false,
  location_source TEXT, verified_at TIMESTAMPTZ);
CREATE INDEX offices_geom_gix ON offices USING gist(geom);   -- "in this rectangle?"
CREATE INDEX offices_city_idx ON offices(city_id);

-- people & FREE contacts -----------------------------------------
CREATE TABLE people (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), name TEXT, linkedin TEXT);
CREATE TABLE company_people (
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  person_id UUID REFERENCES people(id) ON DELETE CASCADE,
  role TEXT, is_referrer BOOLEAN DEFAULT false,
  PRIMARY KEY(brand_id,person_id,role));
CREATE TYPE contact_type AS ENUM ('hr','careers','leadership','general');
CREATE TABLE company_contacts (
  id BIGSERIAL PRIMARY KEY, brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  type contact_type NOT NULL, email TEXT, url TEXT,
  is_public BOOLEAN DEFAULT true, source_url TEXT NOT NULL,  -- provenance required
  opted_out BOOLEAN DEFAULT false, verified_at TIMESTAMPTZ);

-- jobs (real postings, not stubs) --------------------------------
CREATE TABLE job_postings (
  id BIGSERIAL PRIMARY KEY, brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  city_id TEXT REFERENCES cities(id), title TEXT, track TEXT, seniority TEXT,
  fresher_friendly BOOLEAN DEFAULT false, apply_url TEXT,
  is_walkin BOOLEAN DEFAULT false, walkin_at TIMESTAMPTZ, venue TEXT,
  source_url TEXT, posted_at TIMESTAMPTZ, expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX job_postings_city_idx ON job_postings(city_id,expires_at);
-- apply_url is a listing's natural identity for the daily refresh upsert
-- (services/pipeline/src/steps/refresh_jobs.ts) — UNIQUE allows multiple
-- NULLs, so it's harmless for any row that somehow lacks one.
CREATE UNIQUE INDEX job_postings_apply_url_key ON job_postings(apply_url);

-- news -----------------------------------------------------------
CREATE TABLE news_articles (
  id BIGSERIAL PRIMARY KEY, title TEXT NOT NULL, url TEXT UNIQUE NOT NULL,
  source TEXT, category TEXT, published_at TIMESTAMPTZ);
CREATE TABLE company_news (
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  article_id BIGINT REFERENCES news_articles(id) ON DELETE CASCADE,
  PRIMARY KEY(brand_id,article_id));

-- monetization ---------------------------------------------------
CREATE TYPE ad_kind   AS ENUM ('banner','boost','flash','featured');
CREATE TYPE ad_status AS ENUM ('waitlisted','queued','live','expired','rejected');
CREATE TABLE ad_bookings (
  id BIGSERIAL PRIMARY KEY, brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  city_id TEXT REFERENCES cities(id), kind ad_kind NOT NULL, amount_inr INT NOT NULL,
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, status ad_status DEFAULT 'waitlisted',
  contact_email TEXT, payment_ref TEXT, created_at TIMESTAMPTZ DEFAULT now());
CREATE TYPE connect_kind AS ENUM ('intro_call','resume_review','referral');
CREATE TABLE connect_requests (
  id BIGSERIAL PRIMARY KEY, candidate_email TEXT NOT NULL,
  referrer_person_id UUID REFERENCES people(id), brand_id UUID REFERENCES brands(id),
  kind connect_kind NOT NULL, fee_inr INT, commission_inr INT,
  status TEXT DEFAULT 'requested', route_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now());

-- trust / provenance / ops ---------------------------------------
CREATE TABLE sources (id BIGSERIAL PRIMARY KEY, name TEXT, kind TEXT, base_url TEXT);
CREATE TABLE field_evidence (
  id BIGSERIAL PRIMARY KEY, entity TEXT, entity_id UUID, field TEXT, value TEXT,
  source_id BIGINT REFERENCES sources(id), source_url TEXT, confidence INT,
  checked_at TIMESTAMPTZ DEFAULT now());
CREATE INDEX field_evidence_idx ON field_evidence(entity,entity_id,field);
CREATE TABLE submissions (
  id BIGSERIAL PRIMARY KEY, city_id TEXT REFERENCES cities(id), name TEXT NOT NULL,
  website TEXT, tagline TEXT, stage TEXT, hiring BOOLEAN, jobs_url TEXT, email TEXT,
  raw JSONB, status TEXT DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE page_views (            -- own first-party analytics
  id BIGSERIAL PRIMARY KEY, city_id TEXT, path TEXT, referrer TEXT,
  event TEXT, day DATE DEFAULT now(), created_at TIMESTAMPTZ DEFAULT now());
CREATE TABLE ingestion_runs (
  id BIGSERIAL PRIMARY KEY, city_id TEXT, source TEXT,
  started_at TIMESTAMPTZ DEFAULT now(), finished_at TIMESTAMPTZ,
  found INT, upserted INT, needs_review INT, notes TEXT);

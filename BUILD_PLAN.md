# Startup Atlas — Complete Build Plan

> Companion to [`CLAUDE.md`](./CLAUDE.md) — that file is the full spec (schema, architecture,
> rationale). This file is the **complete execution order**: every file in the project, what it's
> responsible for, what it imports from what, and the sequence to build them in. No time-box —
> phases are ordered by dependency and risk, not by a clock. Read a row, code it, check it off,
> move to the next.
>
> **Golden rule stays locked:** cut *features* under real pressure, never *data trust*. Nothing in
> this plan touches sourced facts, precision labelling, or the no-fake-pin rule.

> **Note on the Master Spec artifact:** an earlier "72-hour plan" artifact (diagrams/mockups from
> the Cowork session) treats Typesense, Razorpay escrow, subscriptions, and the warm-path graph as
> immediate v1 work, and makes the Telegram bot — not the admin panel — the control plane.
> `CLAUDE.md` deliberately supersedes that: it demotes all of those to later-phase/roadmap work and
> locks the **admin panel** as the control plane, with the bot as an optional one-way notifier. This
> plan follows `CLAUDE.md` throughout — including here, where the full admin panel (Phase 4) is
> built for real instead of stubbed.

> **No payment gateway — manual QR verification instead.** Every paid surface in this plan (ads,
> recruiter subscriptions, paid connect) uses the same mechanism: a QR code shown on the page →
> payer scans it and pays via their own UPI app → submits the transaction id in a form → nothing
> goes live until an admin manually verifies it in Phase 4's `app/payments/page.tsx`. This replaces
> Razorpay (Orders, Route escrow, webhooks) everywhere in this plan — no gateway integration, no
> API keys on the payment path, no webhook signature verification. The trade-off is honest: escrow
> and instant activation become manual, admin-mediated steps instead of automated ones. See Phase 5
> for the shared `payment_verifications` table this runs on.

---

## Part 0 — Neon database setup (copy-paste SQL)

This is what already ran to get Phase 1 live — written out step-by-step so you can reproduce it
(a fresh project, a teammate's own DB, disaster recovery, whatever). Both blocks below are
identical to `packages/db/schema.sql` and `packages/db/seed/cities.sql` in the repo — the files
stay the source of truth, this is just the copy-paste-ready version.

**Steps:**

1. Go to **[neon.tech](https://neon.tech)**, sign in, click **New Project**.
2. Name it (e.g. `startup-atlas`), pick a region close to your users — `ap-southeast-1` (Singapore)
   is a reasonable default for an India-focused product.
3. Once created, open the project's **Dashboard → SQL Editor**.
4. Paste **Block A** below, run it. Then paste **Block B**, run it.
5. Run the verification query at the bottom — you should see 22 table names and 2 city rows.
6. From **Dashboard → Connection Details**, copy the connection string that has **`-pooler`** in
   the hostname (e.g. `...-pooler.c-3.ap-southeast-1.aws.neon.tech`) — that's the pooled one.
   **Note:** unlike Supabase (which puts its pooler on port `6543`), Neon's pooler uses the same
   port as the direct connection (`5432`, usually omitted from the URL) — the `-pooler` in the
   *hostname* is what tells you you've got the right one. Paste it into `.env` as `DATABASE_URL`.

**Block A — schema** (extensions, tables, enums, indexes):

```sql
-- Startup Atlas — core schema. Run once against a fresh Postgres+PostGIS DB.
-- Source of truth: CLAUDE.md section 5 / packages/db/schema.sql

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
CREATE TYPE company_kind  AS ENUM ('startup','vc');
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
```

**Block B — seed the two launch cities:**

```sql
-- Seed the two launch cities. Centroids are approximate city-center points;
-- bbox should be tightened once real coverage is known (see packages/config/src/cities.ts).

INSERT INTO cities (id, name, state, center_lat, center_lng, default_zoom) VALUES
  ('pune',   'Pune',   'Maharashtra', 18.5204, 73.8567, 12),
  ('mumbai', 'Mumbai', 'Maharashtra', 19.0760, 72.8777, 12)
ON CONFLICT (id) DO NOTHING;
```

**Verification query** — paste this last, you should get 22 rows back plus a 2-row `cities` list:

```sql
select table_name from information_schema.tables where table_schema='public' order by 1;
select id, name from cities order by id;
```

Both blocks are idempotent-safe to re-run (`CREATE TABLE IF NOT EXISTS` isn't used, so re-running
Block A against a DB that already has these tables will error on `CREATE TABLE` — that's expected
and harmless, it means the schema's already there; Block B is genuinely safe to re-run any time
via its `ON CONFLICT DO NOTHING`).

---

## Part 1 — Module dependency map

How the pieces of the monorepo actually talk to each other. Read this once before touching Phase
2 onward — every phase below builds along these arrows.

```mermaid
flowchart TB
    subgraph SOURCES["External sources (free)"]
        DPIIT[data.gov.in / DPIIT]
        MCA[MCA / CIN registry]
        INCUBATORS[Incubator portfolio pages]
        RSS[News RSS feeds]
        SITES[Company websites]
        OSM[OpenStreetMap / Nominatim]
        OLLAMA[Local LLM — Ollama]
    end

    subgraph PIPE["services/pipeline"]
        COLLECT["sources/*<br/>(one file per source)"]
        STEPS["steps/*<br/>normalize → dedupe → enrich_llm →<br/>geocode → verify_score → upsert"]
        RUN["run.ts / refresh-news.ts / refresh-jobs.ts<br/>(entry points)"]
    end

    subgraph SHARED["packages/* (shared, no build step — raw .ts)"]
        CORE["core<br/>types, scoring, slug, taxonomy, geo"]
        CONFIG["config<br/>cities, sectors, feature flags"]
        DB["db<br/>schema.sql, queries/*, graph/*"]
    end

    PG[(Postgres + PostGIS<br/>on Neon/Supabase)]

    subgraph WEB["apps/web (public product)"]
        SNAPSHOT["lib/snapshot.ts / lib/bounds.ts<br/>(the hybrid switch)"]
        PAGES["app/**/page.tsx<br/>city picker, map+grid, profile, jobs"]
        APIROUTES["app/api/**/route.ts<br/>snapshot, bounds, search, submit,<br/>advertise, track, payment-verification"]
    end

    subgraph ADMIN["apps/admin (control plane)"]
        AACTIONS["lib/actions.ts<br/>(server actions writing to DB)"]
        APAGES["app/**/page.tsx<br/>review queue, brands, ads, submissions, stats"]
    end

    subgraph OPS["Optional ops"]
        BOT["services/bot<br/>one-way Telegram notifier"]
        MON["services/monitoring<br/>Prometheus + Grafana"]
    end

    TYPESENSE[(Typesense — v2, only once<br/>a city flips useBounds)]

    DPIIT --> COLLECT
    MCA --> COLLECT
    INCUBATORS --> COLLECT
    RSS --> COLLECT
    SITES --> COLLECT
    COLLECT --> STEPS
    OSM --> STEPS
    OLLAMA --> STEPS
    STEPS --> RUN
    RUN -->|writes| DB
    DB --> PG

    CORE --- CONFIG
    CORE --- DB
    STEPS -.imports.-> CORE
    STEPS -.imports.-> CONFIG
    STEPS -.imports.-> DB

    SNAPSHOT -.imports.-> DB
    SNAPSHOT -.imports.-> CONFIG
    PAGES -.imports.-> SNAPSHOT
    PAGES -.imports.-> CORE
    APIROUTES -.imports.-> DB
    SNAPSHOT -->|reads| PG
    APIROUTES -->|reads/writes| PG
    SNAPSHOT -.at scale.-> TYPESENSE

    AACTIONS -.imports.-> DB
    APAGES -.imports.-> AACTIONS
    AACTIONS -->|writes status| PG

    RUN -.on failure.-> BOT
    APAGES -.review backlog alert.-> BOT
    MON -.scrapes.-> PG
    MON -.scrapes.-> PIPE
```

**The one rule that keeps this simple:** `packages/db` is the only place SQL lives. Every other
package/app imports typed functions from it — nobody else writes a raw query against Postgres.
`packages/core` and `packages/config` have zero dependencies on anything else in the repo (pure
types/logic/data) — that's what makes them safely shared by the pipeline, the web app, and the
admin app without circular imports.

---

## Part 2 — Full project file tree

Status tags: **done** = built and verified this session · **next** = the next thing to build ·
**planned** = designed here, not yet started.

```
startup-atlas/
├─ apps/
│  ├─ web/                                    # public product
│  │  ├─ package.json                         # done
│  │  ├─ next.config.mjs                      # done
│  │  ├─ tsconfig.json                        # done
│  │  ├─ tailwind.config.ts                   # done
│  │  ├─ postcss.config.js                    # done
│  │  ├─ app/
│  │  │  ├─ layout.tsx                        # done
│  │  │  ├─ globals.css                       # done
│  │  │  ├─ page.tsx                          # next  (Phase 2 — city picker)
│  │  │  ├─ sitemap.ts                        # planned (Phase 6)
│  │  │  ├─ robots.ts                         # planned (Phase 6)
│  │  │  ├─ privacy/page.tsx                  # planned (Phase 6)
│  │  │  ├─ terms/page.tsx                    # planned (Phase 6)
│  │  │  ├─ submit/page.tsx                   # planned (Phase 3)
│  │  │  ├─ advertise/page.tsx                # planned (Phase 5)
│  │  │  ├─ [city]/
│  │  │  │  ├─ page.tsx                       # next  (Phase 2 — map + grid)
│  │  │  │  ├─ jobs/page.tsx                  # planned (Phase 3)
│  │  │  │  └─ company/[slug]/page.tsx        # next  (Phase 2 — SSR profile)
│  │  │  └─ api/
│  │  │     ├─ snapshot/[city]/route.ts       # next  (Phase 2 — empty placeholder exists)
│  │  │     ├─ bounds/route.ts                # planned (Phase 10)
│  │  │     ├─ search/route.ts                # planned (Phase 10)
│  │  │     ├─ ads/route.ts                   # planned (Phase 5)
│  │  │     ├─ advertise/route.ts             # planned (Phase 5)
│  │  │     ├─ submit/route.ts                # planned (Phase 3)
│  │  │     ├─ track/route.ts                 # planned (Phase 6)
│  │  │     ├─ connect/route.ts               # planned (Phase 9, v2)
│  │  │     └─ payment-verification/route.ts  # planned (Phase 5 — shared by
│  │  │                                       #   ads/subscriptions/connect, see note)
│  │  ├─ components/
│  │  │  ├─ CityPicker.tsx                    # planned (Phase 2)
│  │  │  ├─ TopBar.tsx                        # planned (Phase 2)
│  │  │  ├─ CityExplorer.tsx                  # planned (Phase 2)
│  │  │  ├─ MapView.tsx                       # planned (Phase 2)
│  │  │  ├─ PrecisionBadge.tsx                # planned (Phase 2)
│  │  │  ├─ VerifiedBadge.tsx                 # planned (Phase 2)
│  │  │  ├─ ContactsList.tsx                  # planned (Phase 3)
│  │  │  ├─ JobCard.tsx                       # planned (Phase 3)
│  │  │  ├─ NewsPanel.tsx                     # planned (Phase 3)
│  │  │  ├─ SponsorBar.tsx                    # planned (Phase 5)
│  │  │  ├─ AdSlot.tsx                        # planned (Phase 5)
│  │  │  ├─ PaymentQR.tsx                     # planned (Phase 5 — shared QR +
│  │  │  │                                    #   instructions, used everywhere money changes hands)
│  │  │  └─ forms/
│  │  │     ├─ SubmitForm.tsx                 # planned (Phase 3)
│  │  │     ├─ AdvertiseForm.tsx              # planned (Phase 5)
│  │  │     ├─ PaymentVerificationForm.tsx    # planned (Phase 5 — shared: name,
│  │  │     │                                 #   contact, transaction id, optional screenshot)
│  │  │     └─ ConnectModal.tsx               # planned (Phase 9, v2)
│  │  └─ lib/
│  │     ├─ snapshot.ts                       # done  (the hybrid loader)
│  │     ├─ admin/                            # done  (auth.ts, actions.ts, rate-limit.ts)
│  │     ├─ map/style.ts                      # done  (self-hosted PMTiles rendering)
│  │     ├─ bounds.ts                         # planned (Phase 10 — the flip's other half)
│  │     ├─ search.ts                         # planned (Phase 10, v2)
│  │     └─ analytics.ts                      # planned (Phase 6)
│  │
│  └─ admin/                                  # control plane
│     ├─ package.json                         # planned (Phase 4)
│     ├─ middleware.ts                        # planned (Phase 4 — auth gate)
│     ├─ app/
│     │  ├─ layout.tsx                        # planned (Phase 4)
│     │  ├─ page.tsx                          # planned (Phase 4 — dashboard/stats)
│     │  ├─ login/page.tsx                    # planned (Phase 4)
│     │  ├─ review/page.tsx                   # planned (Phase 4 — the review queue)
│     │  ├─ brands/page.tsx                   # planned (Phase 4 — bulk browse/edit)
│     │  ├─ brands/[id]/page.tsx              # planned (Phase 4 — single edit form)
│     │  ├─ submissions/page.tsx              # planned (Phase 4)
│     │  ├─ payments/page.tsx                 # planned (Phase 4 — the ONE queue for every
│     │  │                                    #   pending payment_verifications row, any kind)
│     │  ├─ connect/page.tsx                  # planned (Phase 9, v2 — mark delivered/released)
│     │  ├─ ingest/page.tsx                   # planned (Phase 4 — run-ingest trigger)
│     │  └─ api/auth/route.ts                 # planned (Phase 4)
│     └─ lib/
│        ├─ auth.ts                           # planned (Phase 4)
│        └─ actions.ts                        # planned (Phase 4 — server actions)
│
├─ services/
│  ├─ pipeline/                               # runs on the ingestion machine
│  │  ├─ package.json                         # done
│  │  ├─ tsconfig.json                        # done
│  │  └─ src/
│  │     ├─ run.ts                            # done  (discovery entry point)
│  │     ├─ refresh-news.ts                   # done
│  │     ├─ refresh-jobs.ts                   # planned (Phase 7)
│  │     ├─ refresh-subscriptions.ts          # planned (Phase 8, v2 — expiry check)
│  │     ├─ refresh-connect.ts                # planned (Phase 9, v2 — overdue-delivery flag)
│  │     ├─ types.ts                          # done
│  │     ├─ sources/
│  │     │  ├─ index.ts                       # done  (registers collectors)
│  │     │  ├─ incubators.ts                  # done  (Venture Center — 124 brands live)
│  │     │  ├─ bhau.ts                        # planned (Phase 7)
│  │     │  ├─ msins.ts                       # planned (Phase 7)
│  │     │  ├─ sine.ts                        # planned (Phase 7)
│  │     │  ├─ ninetyone_springboard.ts       # planned (Phase 7)
│  │     │  ├─ dpiit.ts                       # planned (Phase 7)
│  │     │  ├─ mca.ts                         # planned (Phase 7)
│  │     │  ├─ company_site.ts                # planned (Phase 7)
│  │     │  └─ news_rss.ts                    # done  (feeds only, not a brand collector)
│  │     ├─ steps/
│  │     │  ├─ normalize.ts                   # done
│  │     │  ├─ dedupe.ts                      # done
│  │     │  ├─ enrich_llm.ts                  # done
│  │     │  ├─ geocode.ts                     # done
│  │     │  ├─ verify_score.ts                # done
│  │     │  ├─ upsert.ts                      # done
│  │     │  ├─ refresh_news.ts                # done
│  │     │  ├─ refresh_jobs.ts                # planned (Phase 7)
│  │     │  ├─ verify_legal_entity.ts         # planned (Phase 7)
│  │     │  └─ reindex_search.ts              # planned (Phase 10, v2)
│  │     └─ lib/
│  │        ├─ retry.ts                       # done
│  │        ├─ nominatim.ts                   # done
│  │        ├─ llm.ts                         # done
│  │        ├─ telegram.ts                    # planned (Phase 6, optional)
│  │        └─ typesense.ts                   # planned (Phase 10, v2)
│  │
│  ├─ bot/                                    # optional one-way notifier
│  │  └─ src/index.ts                         # planned (Phase 6) — or just call
│  │                                          #   lib/telegram.ts directly, see Phase 6 note
│  └─ monitoring/                             # optional
│     ├─ docker-compose.yml                   # planned (Phase 7, optional)
│     └─ prometheus.yml                       # planned (Phase 7, optional)
│
├─ packages/
│  ├─ config/
│  │  └─ src/
│  │     ├─ index.ts                          # done
│  │     ├─ cities.ts                         # done
│  │     ├─ sectors.ts                        # planned (Phase 3 — taxonomy for filters)
│  │     └─ env.ts                            # planned (Phase 6 — typed env access)
│  │
│  ├─ core/
│  │  └─ src/
│  │     ├─ index.ts                          # done
│  │     ├─ types.ts                          # done
│  │     ├─ scoring.ts                        # done
│  │     ├─ slug.ts                           # done
│  │     ├─ taxonomy.ts                       # planned (Phase 3 — sector/stage canon)
│  │     └─ geo/precision.ts                  # planned (Phase 10 — bbox/distance helpers)
│  │
│  └─ db/
│     ├─ schema.sql                           # done  (live on Neon)
│     ├─ index.ts                             # done
│     ├─ seed/
│     │  ├─ cities.sql                        # done  (live on Neon)
│     │  └─ areas.sql                         # planned (Phase 7 — named localities)
│     ├─ migrations/
│     │  ├─ 0000_payment_verifications.sql    # done  (SQL below — needed before Phase 5,
│     │  │                                    #   not v2: ads need this at launch)
│     │  ├─ 0001_recruiter_subscriptions.sql  # done  (SQL below, run at Phase 8)
│     │  └─ 0002_person_connections.sql       # planned (Phase 11, v2 — new tables)
│     ├─ queries/
│     │  ├─ brands.ts                         # done
│     │  ├─ jobs.ts                           # done
│     │  ├─ contacts.ts                       # done
│     │  ├─ news.ts                           # planned (Phase 3)
│     │  ├─ ads.ts                            # planned (Phase 5)
│     │  ├─ payments.ts                       # planned (Phase 5 — insert/list/approve/reject
│     │  │                                    #   payment_verifications, shared by every paid surface)
│     │  ├─ recruiters.ts                     # planned (Phase 8, v2)
│     │  └─ admin.ts                          # planned (Phase 4)
│     └─ graph/
│        └─ warm_path.ts                      # planned (Phase 11, v2)
│
├─ infra/
│  ├─ pmtiles/                                # done — README.md + build/ (gitignored,
│  │                                          #   local build tooling, not committed)
│  ├─ nominatim/                              # planned (only if you outgrow the public
│  │                                          #   rate limit — see CLAUDE.md §15)
│  └─ deploy/
│     └─ .github/workflows/
│        ├─ refresh-jobs.yml                  # planned (Phase 7)
│        ├─ refresh-news.yml                  # planned (Phase 7)
│        └─ discovery.yml                     # planned (Phase 7)
│
├─ pnpm-workspace.yaml                        # done
├─ turbo.json                                 # done
├─ tsconfig.base.json                         # done
├─ CLAUDE.md                                  # done (source of truth)
└─ BUILD_PLAN.md                              # this file
```

---

## Phase 1 — Data Foundation Live + App Skeleton ✅ DONE

**Goal:** Postgres live and being filled by the pipeline; the Next.js app exists and can read
from that DB.

> **Status:** `brands` has **124 real rows** ingested from Venture Center's live portfolio (142
> found, 124 after dedupe), all in `review` status with honest `synthetic` precision, waiting for
> admin approval (Phase 4) before they'd ever reach a public query. `apps/web` boots and all 5
> workspace packages typecheck clean.

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/db/schema.sql` | Every table/enum/index from CLAUDE.md §5 | `psql` / Supabase/Neon SQL editor | Live — verified all 22 tables + PostGIS on the Neon DB in `.env`. |
| 2 | `packages/db/seed/cities.sql` | `pune`/`mumbai` rows in `cities` | same | Seeded — both cities confirmed present. |
| 3 | `packages/db/queries/brands.ts` | `getPublishedBrands(cityId)`, `getBrandBySlug(cityId, slug)`, `getAllPublishedSlugs()` | `pg` via `getPool()`, `@startup-atlas/core` for types | Filters `status IN ('published','probable')` — never exposes `review`/`archived` outside admin. Joins `offices` in one round trip; assumes one office per brand (true — `upsert.ts` deletes+reinserts per run). |
| 4 | `packages/db/queries/jobs.ts` | `getOpenJobs(cityId)` | `pg` | Walk-ins sort first. |
| 5 | `packages/db/queries/contacts.ts` | `getPublicContacts(brandId)` | `pg` | `is_public = true AND opted_out = false` enforced in the query itself. |
| 6 | `services/pipeline/src/sources/news_rss.ts` | Fetches/parses RSS, returns plain `NewsItem[]` — no brand matching | `rss-parser` | One dead feed doesn't kill the others (each wrapped in try/catch). |
| 7 | `services/pipeline/src/steps/refresh_news.ts` + `refresh-news.ts` | Upserts `news_articles`, links to existing brands by name substring match | `@startup-atlas/db` | Kept separate from brand discovery — matching a headline to a *new* brand risks inventing companies from noisy text. Run: `pnpm --filter services-pipeline run refresh-news pune`. |
| 8 | Backfill run | Fills the DB | — | `pnpm --filter services-pipeline run start pune` → 124 brands landed, all `review` tier (score 36 = website +20, domain +8, description +8; no sector/stage/founded_year yet, all `synthetic` precision — no addresses in this source). |
| 9 | `apps/web/package.json` | Declares the Next.js app as a workspace package | `next@^15`, `react@^19`, `maplibre-gl`, `tailwindcss@^3`, `zod` | Named plain `web` — `turbo.json` picks it up automatically. |
| 10 | `next.config.mjs` etc. | Next.js App Router scaffold | `next`, `tailwindcss`, `postcss`, `autoprefixer` | **`transpilePackages: ["@startup-atlas/core","@startup-atlas/config","@startup-atlas/db"]` is required** — those packages ship raw `.ts`, Next won't bundle them without it. |
| 11 | `app/layout.tsx` + `globals.css` | Root shell, Tailwind | — | Thin — no `TopBar` yet, that's Phase 2. |
| 12 | `apps/web/lib/snapshot.ts` | **The hybrid switch** (CLAUDE.md §4/§6) | `@startup-atlas/db`, `@startup-atlas/config` | `{ city, brands, facets }`, facets via `Set` over already-fetched brands. |

**Three real bugs found and fixed — know about these:**

1. `packages/{core,config,db}/package.json` were missing `"type": "module"`. ESM `export` syntax +
   no `"type"` field = Node treats the package as CommonJS when imported from an ESM consumer
   (`services/pipeline`), and named imports fail **at runtime only** — `tsc --noEmit` never catches
   this. Fixed by adding `"type": "module"` to all three.
2. `tsx` doesn't auto-load `.env`. Fixed with Node's built-in `--env-file=../../.env` flag on the
   pipeline's `start`/`refresh-news` scripts (no `dotenv` dependency needed).
3. `venturecenter.co.in/portfolio/` was a dead URL (404). The live site is on the `www` subdomain
   at `www.venturecenter.co.in/startups-and-success-stories/startups`, with different selectors
   (`.startups-list article`). Fixed in `sources/incubators.ts`, verified against live HTML.

---

## Phase 2 — Core Read Path (Map, Grid, Company Profile) ✅ DONE

**Goal:** `localhost:3000` shows Pune's pins on a map, filters/searches them in memory, and a
click lands on a server-rendered company profile.

> **Status:** built and verified live end-to-end via curl (`/`, `/pune`, `/mumbai`,
> `/api/snapshot/pune`, and a real company profile all return 200 with correct SSR content,
> correct `<title>`, and an honest `Approximate — city centroid` precision label — no fake exact
> pins). 25 of the 124 ingested brands were published through the admin review flow so the
> map/grid have real data; the other 99 sit in `/admin/review`. `kind` (startup/vc) was added to
> `BrandListItem`/the snapshot facets to support the "All types" filter, which wasn't called out
> explicitly before. **One deliberate scope change:** the admin panel (Phase 4) lives at `/admin`
> inside `apps/web`, not a separate `apps/admin` project — a second full Next.js install costs
> ~18 minutes before any admin code gets written; splitting it out later for deploy isolation is
> a config change, not a rewrite.

```mermaid
flowchart TD
    A["apps/web/app/api/snapshot/[city]/route.ts"] --> B["apps/web/app/page.tsx (city picker)"]
    B --> C["apps/web/components/CityPicker.tsx"]
    C --> D["apps/web/app/[city]/page.tsx (fetches snapshot server-side)"]
    D --> E["apps/web/components/TopBar.tsx (search + filters, client)"]
    E --> F["apps/web/components/CityExplorer.tsx (in-memory filter + grid, client)"]
    F --> G["apps/web/components/MapView.tsx (MapLibre + clustering, client)"]
    G --> H["apps/web/components/PrecisionBadge.tsx + VerifiedBadge.tsx"]
    H --> I["apps/web/app/[city]/company/[slug]/page.tsx (SSR profile, SEO)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `app/api/snapshot/[city]/route.ts` | Thin HTTP wrapper around `lib/snapshot.ts`, edge-cached | Next.js Route Handlers | `export const revalidate = 300;` for now — real ISR tuning is post-launch. An empty placeholder file already exists here from scaffolding — fill it in. |
| 2 | `app/page.tsx` | Screen 1 — city picker landing (FR-1) | Server Component | Pune + Mumbai cards; "detect location" and search-to-city can come later, not launch-blocking. |
| 3 | `components/CityPicker.tsx` | Renders the two city cards, links to `/pune` / `/mumbai` | — | Plain `<Link href={\`/${city.id}\`}>`. Server component, no client state needed. |
| 4 | `app/[city]/page.tsx` | Screen 2 — fetches the snapshot server-side (direct import of `lib/snapshot.ts`), passes it down | — | `notFound()` from `next/navigation` if `cityId` isn't in `packages/config`'s `cities` list. |
| 5 | `components/TopBar.tsx` | Control bar (FR-3): search, type/area/stage/sector dropdowns, map/grid toggle, jobs count | `useState` | Client component (`'use client'`), state-only, no fetching. Lift filter state up to `CityExplorer`. Exact copy from the Master Spec mock: 📍 logo + city name · search "Search startups, sectors, founders…" · 4 filter pills ("All types ▾ / All areas ▾ / All stages ▾ / All sectors ▾") · Map/Grid toggle · "💼 jobs" live count · "Submit" button. |
| 6 | `components/CityExplorer.tsx` | Owns filter state, filters the in-memory snapshot, renders grid or map | — | The in-memory filtering CLAUDE.md §8 describes — no server round-trip per keystroke. `useMemo` the filtered list. |
| 7 | `components/MapView.tsx` | MapLibre map: clustered, precision-aware pins | `maplibre-gl`, `pmtiles` | Vanilla `maplibre-gl` (skip `react-map-gl`), `useRef` + `useEffect` to init once. **Basemap upgraded to self-hosted PMTiles** (`infra/pmtiles/` — see its README) — the CLAUDE.md §2 locked decision, done for real rather than deferred: `apps/web/public/tiles/maharashtra.pmtiles` (Planetiler + OpenMapTiles profile, bounded to Pune+Mumbai, 38MB, zoom 0–14), read directly by MapLibre via the `pmtiles://` protocol (`Protocol` from the `pmtiles` package, registered once). `apps/web/lib/map/style.ts` defines the actual rendering (roads/water/buildings/labels) since raw vector tiles carry no visual style. Clustering: MapLibre's **built-in** `cluster: true` GeoJSON source option, no Supercluster. Color pins by `precision` (exact/building/street = solid, area/synthetic = faded ring) — this *is* the trust feature. |
| 8 | `components/PrecisionBadge.tsx`, `VerifiedBadge.tsx` | Small reusable badges shown on cards and the profile page | — | `PrecisionBadge` renders the honest label ("exact location" vs "approximate — area centroid"); `VerifiedBadge` shows `last_verified_at` relative time. Both pure presentational, take props, no data fetching. |
| 9 | `app/[city]/company/[slug]/page.tsx` | Screen 3 — SSR company profile (FR-4), the SEO surface | `@startup-atlas/db` | Fetch **directly from Postgres** (fresher than the snapshot, and this is where crawlers land). `generateMetadata()` for title/description. Show precision honestly — if `synthetic`, say so. |

**Done-when:** `localhost:3000/pune` shows pins; clicking a pin/card opens
`/pune/company/<slug>` with real SSR data (visible in view-source, not just client JS).

---

## Phase 3 — Jobs, Contacts, News Panel, Submit ✅ DONE

> **Status:** built and verified — `/pune/jobs` and `/submit` both return 200; the submit API
> re-validates the honeypot and every field server-side with `zod` even though the client already
> checks it. Contacts and news render conditionally (nothing shown when a brand has neither),
> matching the "never show an empty box" rule.

**Goal:** every trust surface from CLAUDE.md is visible on the site — sourced contacts, real job
postings, linked news, and a way for the public to submit/claim a company.

```mermaid
flowchart TD
    A["packages/db/queries/news.ts (NEW)"] --> B["apps/web/components/NewsPanel.tsx"]
    B --> C["apps/web/app/[city]/jobs/page.tsx"]
    C --> D["apps/web/components/JobCard.tsx"]
    D --> E["apps/web/components/ContactsList.tsx (embedded in profile page)"]
    E --> F["apps/web/app/submit/page.tsx + components/forms/SubmitForm.tsx"]
    F --> G["apps/web/app/api/submit/route.ts"]
    G --> H["packages/core/src/taxonomy.ts + packages/config/src/sectors.ts (NEW)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/db/queries/news.ts` | `getCompanyNews(brandId)` — joins `company_news` → `news_articles` | `pg` | Order by `published_at desc`; this is what Phase 1's `refresh_news` step populates. |
| 2 | `components/NewsPanel.tsx` | Renders linked news on the profile page and/or a city-wide feed (FR-7) | — | If a brand has zero linked articles, render nothing — don't show an empty panel. |
| 3 | `app/[city]/jobs/page.tsx` | Jobs + walk-ins list (FR-6) | `queries/jobs.ts` | Server component, sort walk-ins first — the differentiator vs. stub job boards. |
| 4 | `components/JobCard.tsx` | One job/walk-in card | — | Walk-ins get a distinct visual treatment (venue + date prominent) vs. a plain apply link. |
| 5 | `components/ContactsList.tsx` | Free HR/careers/leadership directory on the profile page (FR-5) | `queries/contacts.ts` | Every row shows its `source_url` next to it (provenance) plus a visible opt-out link. |
| 6 | `app/submit/page.tsx` + `components/forms/SubmitForm.tsx` | Submit/claim company form (FR-9) | React form, `zod` | Hidden honeypot field (`display:none`, bots fill it, humans don't) — reject server-side if non-empty. |
| 7 | `app/api/submit/route.ts` | Validates + inserts into `submissions` | `zod`, `@startup-atlas/db` | Re-check the honeypot server-side (never trust client-only validation). Store raw form data in the `raw JSONB` column so nothing is lost even on a field mismatch. |
| 8 | `packages/core/src/taxonomy.ts` + `packages/config/src/sectors.ts` | Canonical sector/stage lists, used by both the submit form's dropdowns and the pipeline's `verify_score` (a matched sector/stage scores higher) | — | One source of truth for "what counts as a sector" — the pipeline and the UI must agree, or filters silently miss records. |

**Done-when:** a real submission through `/submit` lands in `submissions`; a profile page shows
contacts with sources, linked news, and any open jobs for that company.

---

## Phase 4 — Admin Panel (the control plane) ✅ DONE (as `/admin` inside `apps/web`)

> **Status:** built and verified end-to-end, including auth — wrong password → 401, correct
> password → session cookie set, gated pages → 200 with cookie / 307 redirect without one. A
> stateless HMAC-signed session cookie (Web Crypto, Edge-runtime-compatible — `node:crypto` isn't
> available in `middleware.ts`) replaces the plan's original sketch, since that ran into a real
> runtime constraint. Login is now rate-limited (10 attempts / 15 min per IP) after a security
> pass — verified live: attempts 1–10 return 401, attempt 11 returns 429. Bulk brand edit
> (`brands/page.tsx` + `brands/[id]/page.tsx`) and the run-ingest trigger weren't built this pass —
> reviewing/approving, submissions, and payments all are.

**Goal:** the professional admin panel CLAUDE.md §6/§10 describes — review, edit, add, approve
ads, stats, run-ingest — replacing any need for an interactive bot.

```mermaid
flowchart TD
    A["packages/db/queries/admin.ts (NEW)"] --> B["apps/admin/package.json + middleware.ts"]
    B --> C["apps/admin/lib/auth.ts + app/login/page.tsx + api/auth/route.ts"]
    C --> D["apps/admin/lib/actions.ts (server actions)"]
    D --> E["apps/admin/app/review/page.tsx (the queue)"]
    E --> F["apps/admin/app/brands/page.tsx + brands/[id]/page.tsx"]
    F --> G["apps/admin/app/submissions/page.tsx"]
    G --> H["apps/admin/app/payments/page.tsx (unified payment_verifications queue)"]
    H --> I["apps/admin/app/ingest/page.tsx"]
    I --> J["apps/admin/app/page.tsx (dashboard/stats)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/db/queries/admin.ts` | `getBrandsByStatus(status)`, `getSubmissions()`, `getIngestionRuns()`, `getPageViewStats()` | `pg` | The only place that's allowed to read `review`/`archived` rows — everything public-facing stays on `queries/brands.ts`. Payment-related reads live in `queries/payments.ts` instead (Phase 5), kept separate since it's shared by 3 different kinds of paid surface. |
| 2 | `apps/admin/package.json` + `middleware.ts` | Own Next.js app, gated at the middleware level | `next`, `react` | Same `transpilePackages` requirement as `apps/web`. `middleware.ts` checks a session cookie on every request except `/login`. |
| 3 | `apps/admin/lib/auth.ts` + `app/login/page.tsx` + `api/auth/route.ts` | Single shared-password login, sets a signed cookie compared against `ADMIN_SESSION_SECRET` | Node's built-in `crypto` (timing-safe compare) | Start with one shared password — real per-user auth is a real upgrade later, not launch-blocking as long as the secret is strong and never logged. |
| 4 | `apps/admin/lib/actions.ts` | Server actions: `approveBrand`, `archiveBrand`, `updateBrand`, `convertSubmission`, `approvePaymentVerification`, `rejectPaymentVerification` | Next.js Server Actions, `@startup-atlas/db` | Every action re-validates status transitions server-side — this is the data-trust gate, don't let the UI be the only check. `approvePaymentVerification` is the one that matters most now: it flips `payment_verifications.status → 'approved'` **and**, based on `kind`, flips the linked `ad_bookings`/`subscriptions`/`connect_requests` row to its paid state, in one transaction — never approve the verification without also flipping the thing it's verifying. |
| 5 | `app/review/page.tsx` | The review queue — brands where `status = 'review'`, Approve/Edit/Archive per row | — | This is the single most important admin screen — it's what turns `review` rows into public `published`/`probable` ones. Show the score breakdown next to each row so approval is an informed decision, not a guess. |
| 6 | `app/brands/page.tsx` + `brands/[id]/page.tsx` | Bulk browse/search across all brands regardless of status; full edit form on the detail page | — | This is where a human corrects what the pipeline got wrong (bad geocode, wrong sector) — every field the pipeline writes should be editable here. |
| 7 | `app/submissions/page.tsx` | Review public submissions from `/submit`, convert to a real brand row or reject | — | "Convert" should pre-fill a new/edit brand form from the submission's `raw` JSON rather than making the admin retype everything. |
| 8 | `app/payments/page.tsx` | **The one screen for every pending payment** — `payment_verifications` where `status = 'pending'`, regardless of `kind` (ad booking, subscription, connect request) | `queries/payments.ts` | Show `kind`, `amount_inr`, `transaction_id`, `payer_contact`, and (if present) `screenshot_url` per row — that's everything needed to cross-check against your own UPI app's transaction history before approving. Reject with a reason (`notes`) so the payer's follow-up email writes itself. |
| 9 | `app/ingest/page.tsx` | "Run ingest" trigger | — | Vercel serverless functions can't run a long scraping job inline — this button should call a webhook that queues the job for the pipeline machine (or trigger a GitHub Actions `workflow_dispatch`, see Phase 7), not attempt to scrape from within the request. |
| 10 | `app/page.tsx` | Dashboard — review backlog count, pending payment count, recent `ingestion_runs`, basic `page_views` stats | `queries/admin.ts`, `queries/payments.ts` | This is the free first-party stats view CLAUDE.md §10 describes — it doesn't need PostHog to be useful. |

**Done-when:** an admin can log in, see the 124 `review` brands from Phase 1, approve one, and it
appears on the public map within the snapshot's cache window.

---

## Phase 5 — Monetization: Ads (QR + manual verification) ✅ DONE

> **Status:** built and verified end-to-end via a real (then cleaned-up) test transaction: booked
> an ad → submitted a fake UTR → landed in `/admin/payments` → approved → `ad_bookings` flipped to
> `live`. One security fix made during this pass: the amount is now **always looked up
> server-side** (`AD_PRICING`, shared between the form and the API route) rather than trusted from
> the client — the original sketch didn't specify this and it's a real gap for anything
> payment-adjacent. `public/upi-qr.png` doesn't exist yet — `PaymentQR.tsx` falls back to a
> placeholder graphic until you drop your real UPI QR export in.

**Goal:** the first revenue surface live — boosted pins, sponsor tiles, banners — paid via your
own UPI QR code, verified by hand, no payment gateway anywhere in the path.

**Run this first** — `payment_verifications` is the shared table every paid surface in this plan
(ads now, subscriptions in Phase 8, paid connect in Phase 9) writes to. One migration, reused
three times:

```sql
-- packages/db/migrations/0000_payment_verifications.sql
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
```

```mermaid
flowchart TD
    A["packages/db/queries/ads.ts (NEW)"] --> B["packages/db/queries/payments.ts (NEW — shared)"]
    B --> C["apps/web/components/SponsorBar.tsx + AdSlot.tsx"]
    C --> D["apps/web/components/PaymentQR.tsx (shared)"]
    D --> E["apps/web/components/forms/PaymentVerificationForm.tsx (shared)"]
    E --> F["apps/web/app/advertise/page.tsx + forms/AdvertiseForm.tsx"]
    F --> G["apps/web/app/api/advertise/route.ts"]
    G --> H["apps/web/app/api/payment-verification/route.ts (shared)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/db/queries/ads.ts` | `getLiveAds(cityId, kind)` — rows where `status = 'live'` and within `starts_at`/`ends_at` | `pg` | Filter the date window in SQL, not in the component — an expired ad should never even reach the page. |
| 2 | `packages/db/queries/payments.ts` | `insertPaymentVerification(...)`, `getPendingVerifications()`, `approveVerification(id)`, `rejectVerification(id, notes)` | `pg` | Shared by every paid surface — write it once here, not once per feature. `approveVerification` is a transaction: flip `payment_verifications.status` **and** the linked row's status together (see Phase 4 row 4). |
| 3 | `components/SponsorBar.tsx` + `AdSlot.tsx` | Render live ads (FR-8) | — | If there are zero live ads, render nothing — never show an empty placeholder box. |
| 4 | `components/PaymentQR.tsx` | Shows your UPI QR code image + the exact amount + a short "pay, then fill the form below" instruction | — | The QR image itself is a static asset (`public/upi-qr.png`) — no env var, no API. Reused as-is in Phase 8 (subscriptions) and Phase 9 (connect). |
| 5 | `components/forms/PaymentVerificationForm.tsx` | Shared form: payer name, contact (email/phone), transaction id (UTR), optional screenshot upload | React form, `zod` | Takes `kind` + `referenceId` + `amountInr` as props so `AdvertiseForm`, the subscription flow, and `ConnectModal` (Phase 9) can all embed it identically. Screenshot upload is optional — a UTR alone is usually enough to cross-check in your own UPI app; wire Cloudflare R2 for the upload only if you want the extra proof. |
| 6 | `app/advertise/page.tsx` + `forms/AdvertiseForm.tsx` | Booking form (kind, dates, contact email) → then `PaymentQR` + `PaymentVerificationForm` | React form, `zod` | Same honeypot pattern as `SubmitForm.tsx`. Two-step: book first (creates the `ad_bookings` row), then pay-and-verify. |
| 7 | `app/api/advertise/route.ts` | Inserts an `ad_bookings` row, `status = 'waitlisted'` | `zod`, `@startup-atlas/db` | Returns the new row's `id` — the frontend needs it as `referenceId` for the verification form that follows. |
| 8 | `app/api/payment-verification/route.ts` | Shared endpoint: validates the form, calls `insertPaymentVerification` | `zod`, `@startup-atlas/db` | One route for all three kinds — `kind` comes from the request body, not the URL. This is the only new "payment" code in the whole plan; everything downstream is just Postgres rows and an admin approving them. |

**Done-when:** a real ad booking lands in `ad_bookings` as `waitlisted`, a matching
`payment_verifications` row lands as `pending`, an admin approves it in Phase 4's
`app/payments/page.tsx`, and the ad renders live on the site.

---

## Phase 6 — Observability, Legal, Deploy — Launch (partially done)

> **Status:** `sitemap.ts`, `robots.ts`, `privacy/page.tsx`, and `terms/page.tsx` are built and
> verified (all return 200; sitemap correctly includes only published brands). `lib/analytics.ts`,
> `packages/config/src/env.ts`, the observability wiring, and the actual Vercel deploy are not
> done yet — this phase is still the launch gate.

**Goal:** the product is live on a real URL, crawlable, legally minimal-compliant, and you'd know
within minutes if it broke.

```mermaid
flowchart TD
    A["apps/web/app/sitemap.ts + robots.ts"] --> B["apps/web/app/privacy/page.tsx + terms/page.tsx"]
    B --> C["apps/web/app/api/track/route.ts + lib/analytics.ts"]
    C --> D["packages/config/src/env.ts (NEW)"]
    D --> E["Deploy apps/web + apps/admin to Vercel"]
    E --> F["Wire Cloudflare + PostHog + Search Console + UptimeRobot + Sentry"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `app/sitemap.ts` + `robots.ts` | One route per published company (NFR-SEO) | Next.js built-in sitemap convention | Query `getAllPublishedSlugs()` from Phase 1's `brands.ts` — published only. |
| 2 | `app/privacy/page.tsx` + `terms/page.tsx` | Legal minimum for launch | — | Plain static text is fine to start — you're publishing contact info, so something here is not optional, even if a real legal pass comes later. |
| 3 | `app/api/track/route.ts` + `lib/analytics.ts` | First-party `page_views` insert + a `track()` wrapper components call | `@startup-atlas/db` | This is the "own `page_views` table" CLAUDE.md §10 describes — it's what makes admin's `/stats` (Phase 4) useful without waiting on PostHog setup. |
| 4 | `packages/config/src/env.ts` | Typed, validated access to `process.env` across the whole monorepo | `zod` (`z.object({...}).parse(process.env)`) | Import this everywhere instead of raw `process.env.X` — a missing/misnamed env var fails loudly at startup instead of silently at runtime. |
| 5 | Deploy | Two Vercel projects (`apps/web`, `apps/admin`), same repo, different root directories | Vercel | Set `DATABASE_URL` and `ADMIN_SESSION_SECRET` per project in Vercel's dashboard — never commit them. |
| 6 | Observability wiring | Cloudflare Web Analytics (traffic), PostHog (funnels), Google Search Console (search), Microsoft Clarity (heatmaps), UptimeRobot (uptime), Sentry (errors) | `@sentry/nextjs`, PostHog script tag | ~30 min total per CLAUDE.md §10 — mostly pasting a script tag into `layout.tsx` and verifying in each tool's dashboard. |
| 7 | Telegram notifier (optional) | One-way alert when an ingest fails or the review backlog grows | `services/pipeline/src/lib/telegram.ts` calling the Bot API directly (`fetch`), no bot framework needed | CLAUDE.md §11: keep this to ~5 lines, a webhook ping, not an interactive bot — the admin panel already covers interactive review. |

**Done-when:** production URL loads, `sitemap.xml` lists real company pages, and you'd get paged
(Sentry/UptimeRobot) if the site or the DB went down.

**This is the launch line.** Everything from here on is additive — order Phases 7–11 by whichever
lever (more data, more revenue, more scale) matters most once you have real usage signal, rather
than following this document's sequence blindly.

---

## Phase 7 — Broaden Data Sources + Maintenance Cron

**Goal:** more sources feeding the pipeline, jobs/news staying fresh without the ingestion
machine needing to be awake all the time, Mumbai turned on.

```mermaid
flowchart TD
    A["services/pipeline/src/sources/{bhau,msins,sine,ninetyone_springboard}.ts"] --> B["sources/dpiit.ts"]
    B --> C["sources/mca.ts"]
    C --> D["sources/company_site.ts"]
    D --> E["steps/verify_legal_entity.ts"]
    E --> F["steps/refresh_jobs.ts + refresh-jobs.ts entry point"]
    F --> G["packages/db/seed/areas.sql"]
    G --> H[".github/workflows/{discovery,refresh-jobs,refresh-news}.yml"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `sources/{bhau,msins,sine,ninetyone_springboard}.ts` | One collector per remaining incubator from `packages/config`'s `discoverySources` | `cheerio` | Copy `incubators.ts`'s shape exactly — each site needs its own selectors, inspected live (learned the hard way in Phase 1: don't trust a URL/selector without checking it against the real page first). |
| 2 | `sources/dpiit.ts` | Pulls data.gov.in's recognized-startups dataset as a discovery seed | `fetch` (it's a public API/CSV) | CLAUDE.md §7: "treat DPIIT as a discovery seed, not a census" — cross-reference before publishing, don't auto-trust it more than any other source in `verify_score`. |
| 3 | `sources/mca.ts` | Legal entity verification — populates `legal_entities` + `brand_entity_links` | `fetch`/`cheerio` depending on the MCA endpoint you use | This feeds `verify_score`'s "matched CIN +10" signal — write to `legal_entities` directly, this doesn't go through the `RawRecord` brand pipeline. |
| 4 | `sources/company_site.ts` | Once a brand exists, revisits its own website for HR/careers emails and job postings | `cheerio` | This is what actually populates `company_contacts` at scale — the incubator sources alone don't give you contacts. Always store `source_url` — required by the schema and the trust rule. |
| 5 | `steps/verify_legal_entity.ts` | Cross-references a brand against `legal_entities` by name/domain match | `@startup-atlas/db` | Same "plain substring match, not NLP" philosophy as Phase 1's news matching — good enough, keep it simple. |
| 6 | `steps/refresh_jobs.ts` + `refresh-jobs.ts` | Re-visits each brand's careers page, upserts new postings, expires ones no longer seen | `@startup-atlas/db`, `cheerio` | Mirror `refresh-news.ts`'s shape — separate entry point, not part of `run.ts`'s discovery loop. |
| 7 | `packages/db/seed/areas.sql` | Named locality centroids per city (`areas` table) | — | Better `synthetic` fallback than the raw city centroid — "Koregaon Park, Pune" reads as more honest than "Pune" when a real address isn't available. |
| 8 | `.github/workflows/*.yml` | Move jobs/news/discovery refreshes off the always-on-laptop requirement | GitHub Actions, `workflow_dispatch` + `schedule` cron | CLAUDE.md §12 phase 2: jobs daily, news daily, discovery weekly. This is also what Phase 4's "run ingest" button can trigger on demand via `workflow_dispatch`. |
| 9 | *(action)* Mumbai | Flip on the second city | — | Zero rework — `mumbai` is already seeded and configured with `useBounds: false`. Just run `pnpm --filter services-pipeline run start mumbai` once sources exist for it. |

**Done-when:** at least 3–4 sources are feeding the pipeline, jobs/news refresh on a schedule
without manual intervention, and Mumbai has real data too.

---

## Phase 8 — Recruiter Subscriptions (QR + manual verification)

**Goal:** a recurring-revenue tier for recruiters — same QR + verification mechanism as Phase 5,
extended to a monthly renewal instead of a one-off booking.

```sql
-- packages/db/migrations/0001_recruiter_subscriptions.sql
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
```

```mermaid
flowchart TD
    A["packages/db/migrations/0001_recruiter_subscriptions.sql"] --> B["packages/db/queries/recruiters.ts (NEW)"]
    B --> C["apps/web/app/api/subscribe/route.ts"]
    C --> D["apps/web/components/PaymentQR.tsx + forms/PaymentVerificationForm.tsx (reused from Phase 5)"]
    D --> E["services/pipeline/src/refresh-subscriptions.ts (expiry check)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/db/migrations/0001_recruiter_subscriptions.sql` | New schema — CLAUDE.md's shipped schema doesn't define recruiter/subscription tables yet | — | Run once, when you reach this phase — not before. No gateway fields needed (no `razorpay_customer_id` etc.) since there's no gateway. |
| 2 | `packages/db/queries/recruiters.ts` | `createRecruiter`, `createSubscription`, `renewSubscription`, `getActiveSubscription(recruiterId)` | `pg` | `subscriptions.status = 'active'` is the single gate every subscriber-only feature checks. |
| 3 | `app/api/subscribe/route.ts` | Creates a `recruiters` row (if new) + a `subscriptions` row (`status = 'trialing'`) | `zod`, `@startup-atlas/db` | Same shape as `app/api/advertise/route.ts` — book first, then the shared `PaymentQR` + `PaymentVerificationForm` (Phase 5) collects the transaction id against `kind = 'subscription'`. Admin approval (Phase 4) flips it to `active` and sets `current_period_end` (e.g. `now() + interval '30 days'`). |
| 4 | `services/pipeline/src/refresh-subscriptions.ts` | Daily check: any `active` subscription past its `current_period_end` moves to `past_due` | `@startup-atlas/db` | Same cron mechanism as Phase 7's `refresh-jobs`/`refresh-news` — a renewal is just "pay again, submit a new transaction id," so this step only needs to *detect* expiry, not chase payment automatically. |

**Done-when:** a recruiter can submit a subscription request, pay via the QR, get approved in
Phase 4, and a subscriber-only feature correctly checks `subscriptions.status = 'active'`.

---

## Phase 9 — Paid Connect (QR + manual hold)

**Goal:** the intro-call/resume-review/referral flow from CLAUDE.md §4 — without a payment
gateway, "escrow" becomes an honest, admin-mediated hold: you personally don't release the
referrer's payout until delivery is confirmed, tracked as an explicit status, not automated by a
processor.

```mermaid
flowchart TD
    A["apps/web/app/api/connect/route.ts"] --> B["apps/web/components/forms/ConnectModal.tsx"]
    B --> C["apps/web/components/PaymentQR.tsx + forms/PaymentVerificationForm.tsx (reused from Phase 5)"]
    C --> D["apps/admin/app/connect/page.tsx (mark delivered → release)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `app/api/connect/route.ts` | Creates a `connect_requests` row, `status = 'requested'` | `zod`, `@startup-atlas/db` | `connect_requests` already exists in the schema (CLAUDE.md §5) — this phase is mostly wiring, no new tables. Drop the unused `route_transfer_id` column's role — it's dead weight now (harmless to leave in place, just never populated). |
| 2 | `components/forms/ConnectModal.tsx` | The "request an intro" UI on a company profile → then `PaymentQR` + `PaymentVerificationForm` against `kind = 'connect_request'` | React | Same two-step pattern as Phase 5/8: request first, pay-and-verify second. |
| 3 | `apps/admin/app/connect/page.tsx` | Admin's view of the state machine: `requested → paid (verified) → delivered → released` (or `refunded`) | `@startup-atlas/db` | This is where the honesty matters: **you** mark `delivered` only once the referrer/engineer actually did the intro, and **you** send the referrer's commission manually (UPI, bank transfer, whatever) before marking `released`. No automated split — be upfront with both sides that payouts are manual for now. |
| 4 | `services/pipeline/src/refresh-connect.ts` | Daily check: any `paid` request with no `delivered` after N days gets flagged for manual refund | `@startup-atlas/db` | "No delivery in N days → refund" (CLAUDE.md §4) can't auto-refund without a gateway — this step surfaces the flag in Phase 4's dashboard so you refund by hand, it doesn't refund for you. |

**Done-when:** one real paid-connect request completes the full state machine —
requested → paid → delivered → released — with every transition visible and auditable in the
admin app, even though the money itself moved by hand.

---

## Phase 10 — Search at Scale: Typesense + Bounds Flip

**Goal:** flip a city from "ship the whole snapshot" to "bounds query + server search" once it
outgrows in-memory filtering — with zero UI rewrite, because Phase 2 was built for exactly this.

```mermaid
flowchart TD
    A["packages/core/src/geo/precision.ts (NEW — bbox helpers)"] --> B["services/pipeline/src/lib/typesense.ts"]
    B --> C["services/pipeline/src/steps/reindex_search.ts"]
    C --> D["apps/web/app/api/bounds/route.ts"]
    D --> E["apps/web/app/api/search/route.ts"]
    E --> F["apps/web/lib/bounds.ts + lib/search.ts"]
    F --> G["apps/web/components/TopBar.tsx (EDIT: call search API when useBounds)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/core/src/geo/precision.ts` | Shared bbox/distance helpers (e.g. "is this point inside this viewport rectangle") | — | Small, pure functions — used by both the pipeline's future spatial steps and `apps/web`'s bounds query construction. |
| 2 | `services/pipeline/src/lib/typesense.ts` | Typesense client wrapper | `typesense` npm client | One client instance, reused by `reindex_search.ts`. |
| 3 | `steps/reindex_search.ts` | Pushes published/probable brands into a Typesense collection after every `upsert.ts` run | `@startup-atlas/db`, `typesense` | Only runs for cities where `packages/config`'s `useBounds` is `true` — for snapshot cities this step is a no-op, don't waste API calls indexing data nobody queries through Typesense yet. |
| 4 | `app/api/bounds/route.ts` | PostGIS bounds query — `ST_MakeEnvelope` + `ST_Intersects` against `offices.geom`, paginated | `@startup-atlas/db` | This replaces the snapshot's "ship everything" with "ship what's in the visible map rectangle" — same `BrandListItem` shape as `queries/brands.ts` so components don't care which path served them. |
| 5 | `app/api/search/route.ts` | Thin proxy to Typesense for the search box / facets | `typesense` client | Same query shape the in-memory filter used — `TopBar.tsx` shouldn't need to know which backend answered it. |
| 6 | `apps/web/lib/bounds.ts` + `lib/search.ts` | The other half of the hybrid switch — decides per city (via `city.useBounds`) whether to call `snapshot.ts` or `bounds.ts`/`search.ts` | `@startup-atlas/config` | This is the file CLAUDE.md §4/§6 promises: flipping one city's flag changes its data path with no component rewrite. |
| 7 | `components/TopBar.tsx` (edit) | When `useBounds` is true, search calls `api/search` instead of filtering the in-memory array | — | Keep the exact same UI/props contract — only the data source behind it changes. |

**Done-when:** flipping one city's `useBounds` to `true` in `packages/config/src/cities.ts`
changes its data path (verify via network tab — `api/bounds`/`api/search` firing instead of one
snapshot fetch) with no visible UI change.

---

## Phase 11 — Warm-Path Graph

**Goal:** "who can introduce me" — CLAUDE.md's furthest-out feature, a secondary graph read-model
over the same Postgres data (no Neo4j — locked decision from CLAUDE.md §2).

```mermaid
flowchart TD
    A["packages/db/migrations/0002_person_connections.sql (NEW schema)"] --> B["packages/db/graph/warm_path.ts"]
    B --> C["packages/db/queries/admin.ts (EDIT: expose to admin for QA)"]
    C --> D["apps/web/components/WarmPathPanel.tsx (planned)"]
```

| # | File | Responsible for | Libraries | Hints |
|---|---|---|---|---|
| 1 | `packages/db/migrations/0002_person_connections.sql` | **New schema** — a person-to-person edge table doesn't exist yet; `company_people` alone only gives "worked at the same company," not a real network | — | Sketch: `connections (person_id_a, person_id_b, source, created_at)`. Where these edges come from (LinkedIn import? mutual company overlap only?) is a real product decision to make before writing this file, not a given. |
| 2 | `packages/db/graph/warm_path.ts` | Given a target brand, find people within N hops (self → connection → connection) who can introduce you | Plain PostgreSQL `WITH RECURSIVE` over `connections` + `company_people` | No graph database needed for a 2–3 hop traversal at this scale — this is exactly what CLAUDE.md §2 means by "graph is a later secondary read-model," implemented as SQL, not infrastructure. Cap the recursion depth explicitly (e.g. `WHERE depth <= 2`) or a dense network makes this query blow up. |
| 3 | `queries/admin.ts` (edit) | Expose warm-path results to admin for QA before it ever reaches a public UI | — | Trust matters here too — a wrong "so-and-so can introduce you" is worse than no feature at all. Review real output before shipping the UI. |
| 4 | `components/WarmPathPanel.tsx` | Public UI — "N people in your network could introduce you here" | — | Genuinely last — it depends on real connection data existing, which depends on a product decision (item 1) this plan can't make for you. |

**Done-when:** given two real people with a mutual connection in the DB, `warm_path.ts` correctly
finds the path — verified with real data, not synthetic test rows, before any UI ships.

---

## Non-negotiables (never cut, regardless of phase or pressure)

- **Precision labels** — every pin and profile shows its real `loc_precision`, honestly. A
  `synthetic` pin is never rendered like an `exact` one.
- **Provenance** — every public contact carries its `source_url`. No `source_url`, no publish.
- **Status gating** — public queries (`queries/brands.ts`, `snapshot.ts`, `bounds.ts`) only ever
  read `published`/`probable`. `review`/`archived` rows are admin-only, always.
- **No residential addresses** — MCA/legal-entity addresses stay in `legal_entities`, never surface
  as a public office location.
- **SQL stays in `packages/db`** — every other package/app calls typed functions, never writes a
  raw query against the production database directly.
- **No paid status flips itself** — `ad_bookings`, `subscriptions`, and `connect_requests` only
  ever move to their paid/live state through `approvePaymentVerification` (Phase 4), which a human
  triggers after checking a real transaction id. No auto-approve path, ever.

These are what make the product different from the incumbent it's targeting — everything else in
this plan is negotiable in order or scope; these are not.

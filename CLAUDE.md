# Startup Atlas — Master Project Brief & Build Plan

> **Handoff note for Claude Code:** This file is the single source of truth for the project.
> Read it fully before writing code. Rename it to `CLAUDE.md` in your repo root so Claude Code
> loads it automatically every session. Pair it with the visual Master Spec artifact (diagrams,
> UI mockups) at the artifact link from the Cowork session.
>
> **Golden rule:** Cut *features* under time pressure, never *data trust* (sourced facts,
> labelled coordinate precision, no residential addresses). Trust is the whole differentiator.

---

## 1. What we're building

A city-by-city **map of startups** — their locations, jobs, walk-in interviews, news, and the
people who work there — starting with **Pune and Mumbai**, built to scale to many cities.
It directly targets `bangalorestartupmap.com` (a shallow rapid MVP) and beats it on speed, data
quality, and monetization.

**Three ways we win**
1. **Speed people feel** — viewport-scoped data + edge cache + self-hosted vector tiles. Sub-100ms.
2. **Data you can trust** — every field sourced & dated, coordinate precision labelled (never faked), verification tiers.
3. **Revenue built-in** — ads, jobs, subscriptions, and paid connect are first-class from the schema up.

**Why it's beatable there:** the incumbent fakes 36% of pin locations (shown as exact), has jobs
that are just stubs, ships the whole DB to every browser, has no sources and no privacy policy.
Their *own* forensic report recommends almost exactly the architecture below — so the architecture
is the known-right answer; our edge is **execution, data honesty, and automation.**

---

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Primary database | **PostgreSQL + PostGIS** | Geo directory + joins + full-text + money. NOT Cassandra (no spatial index, eventual consistency) or Neo4j (graph is a later secondary read-model). |
| Latency model | **Hybrid: snapshot → bounds** | One cached city snapshot generated from Postgres = instant at small scale; flip a city to bounds-queries + Typesense past ~8k records. One loader swaps, no rewrite. |
| Map tiles | **MapLibre + self-hosted PMTiles** | Zero per-view API calls. |
| Search | **Client filter → Typesense** | Client-side on the snapshot is enough at launch; add Typesense at scale. |
| Payments | **Razorpay Route escrow** | Aggregator holds funds (RBI-compliant), on-hold settlement + linked-account KYC + split. Never become a regulated PA. |
| Data sourcing | **100% free sources** | DPIIT, MCA, incubators, news RSS, company sites, community + self-host Nominatim + free/local LLM. Tracxn/Crunchbase deferred. |
| Logos | **Fetch once, cache** | Resolve per domain once → object storage. Not live favicon redirects. |
| Ingestion host | **Your spare laptop** | More power than a Pi (runs local LLM well). Manage sleep during backfill. Starts Day 0. |
| Control plane | **Professional admin panel** | Does review/edit/add/approve/stats/run-ingest. **Telegram bot is optional** — keep at most a one-way alert notifier. |
| Monitoring | **Prometheus + Grafana (optional)** | Self-hosted infra/pipeline metrics; SaaS analytics cover product/traffic. A simple log + alert is enough at first. |
| Repo shape | **pnpm monorepo** | App, pipeline, admin share one `core` + `db`. Change scoring once, everyone agrees. |
| Stack | **Next.js + Postgres** | Confirmed. |

---

## 3. Requirements

### Functional
- **FR-1** Landing city-picker (cards + detect-location + search); tap → that city's map.
- **FR-2** Per-city map (clustered, precision-aware pins) + grid toggle.
- **FR-3** Control bar: search + filters (type/area/stage/sector) + jobs count + Submit.
- **FR-4** SSR company profiles (SEO) with precision, last-verified, tags, map.
- **FR-5** Free public HR/careers/leadership contact directory + opt-out.
- **FR-6** Jobs + walk-in interviews (title, apply URL, venue, expiry).
- **FR-7** News panel linked to companies.
- **FR-8** Ads: boosted pins, sponsor tiles, flash, banners (+ booking form).
- **FR-9** Submit / claim company form (honeypot-protected).
- **FR-10** Professional admin panel (review, edit, add, approve ads, stats, run ingest).
- **FR-11** *(v2)* Server search + facets (Typesense) at scale.
- **FR-12** *(v2)* Recruiter subscriptions + dashboard.
- **FR-13** *(v2)* Paid connect: intro call / resume review / referral via escrow.
- **FR-14** *(v2)* Warm-path graph ("who can introduce me").

### Non-functional
- **Latency:** <100ms perceived; city load <2s; constant payload as data grows.
- **Cost:** 100% free data; minimal API keys on the hot path; cheap managed infra.
- **Trust:** per-field provenance; labelled coordinate precision; no residential addresses.
- **Scale:** multi-city from row one; snapshot→bounds flip per city, no rewrite.
- **Compliance:** DPDP-aware contacts (public + opt-out); privacy/terms; no fund-holding.
- **SEO:** server-rendered profiles, sitemap (1 route/company), crawlable.

---

## 4. Architecture (read/write split)

**The core idea: the read path and the write path never touch.**

- **Read path (must be instant):** Clients → Edge cache/CDN → Next.js app → Data core.
  Users only ever touch cached, indexed data.
- **Write path (slow, hidden):** Free sources → pipeline (normalize → dedupe → LLM enrich →
  geocode → score → upsert → reindex) → Postgres. Runs on your **laptop** in the background.

```
CLIENTS      Web app · Map (MapLibre) · Profiles · (optional alerts)
   ↑ serves (cached)
EDGE         Edge cache / CDN (ISR + cached viewport JSON)   |  PMTiles tiles (self-host)
   ↑
APP          Next.js server (RSC + REST/RPC) · Auth · Razorpay (escrow)
   ↑ reads/writes
DATA CORE    PostgreSQL+PostGIS (truth) · Redis (cache) · Typesense (search) · Object storage
   ↑ upsert verified / reindex
PIPELINE     Scrapers → LLM enrich (free/local) → Geocode (Nominatim) → Verify·score  [on laptop]
   ↑ ingest
SOURCES      DPIIT · MCA · News RSS · Incubators · Company sites · Community   (all free)
```

**Paid connect escrow flow (v2):** Candidate books → Platform creates Razorpay order with
transfer ON HOLD → Candidate pays → held in escrow → engineer delivers → release minus
commission → payout. No delivery in N days → auto refund.

---

## 5. Database schema (PostgreSQL + PostGIS)

Run against a fresh DB. Brands (public) stay separate from legal entities (MCA/CIN); every
important fact carries evidence; location precision is stored, never faked; money is ACID.

```sql
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

### Verification tiers (the moat)
Score each record 0–100 from evidence; assign a tier:
- **75–100 → published**, **55–74 → probable** (limited-info label), **35–54 → review**
  (admin queue), **<35 → archived** (hidden, never deleted).
- Never penalize bootstrapped/unfunded startups. Never publish residential addresses.

Scoring signals (example weights): working website +20, domain +8, sector +8, stage +8,
description>40ch +8, founded_year +6, founders +8, exact/building/street coords +18 (area/locality +6),
matched CIN +10, seen in ≥2 sources +6.

---

## 6. Project structure (pnpm monorepo)

```
startup-atlas/
├─ apps/
│  ├─ web/                       # public Next.js product
│  │  ├─ app/
│  │  │  ├─ page.tsx             # city picker landing
│  │  │  ├─ [city]/page.tsx      # map + grid (snapshot OR bounds)
│  │  │  ├─ [city]/jobs/page.tsx # jobs + walk-ins
│  │  │  ├─ [city]/company/[slug]/page.tsx  # SSR profile (SEO)
│  │  │  ├─ advertise/ submit/ connect/     # pages + forms
│  │  │  └─ api/{snapshot,bounds,search,ads,advertise,submit,track,webhooks/razorpay}/
│  │  ├─ components/  # CityPicker, TopBar, Map, CityExplorer, NewsPanel,
│  │  │               #   SponsorBar, AdSlot, forms/, badges
│  │  └─ lib/         # search, analytics, payments, auth, snapshot-vs-bounds
│  └─ admin/          # professional web admin console (review, edit, add, dashboards, run-ingest)
├─ services/          # run on your spare laptop
│  ├─ pipeline/  src/{run.ts, sources/*, steps/*}   # ingest & enrich → cloud DB
│  ├─ bot/       src/index.ts                        # OPTIONAL Telegram notifier/ops
│  └─ monitoring/                                     # OPTIONAL Prometheus + Grafana
├─ packages/
│  ├─ db/      schema.sql, migrations/, client, queries/, graph/, seed/
│  ├─ core/    types, scoring, geo/precision, slug, taxonomy
│  └─ config/  cities.ts, sectors.ts, env, feature-flags (per-city useBounds)
├─ infra/    # PMTiles build, deploy, nominatim
└─ pnpm-workspace.yaml turbo.json .env.example README.md
```

**Module responsibilities**
- `packages/db` — the ONLY place SQL lives: schema, migrations, queries, seed.
- `packages/core` — shared domain logic: types, verification scoring, geo/precision, slug, taxonomy. Change once → all agree.
- `packages/config` — cities (centroids, bbox, discovery sources), sectors, env, feature flags.
- `services/pipeline/sources/*` — one collector per free source; each returns raw records; failures isolated.
- `services/pipeline/steps/*` — normalize → dedupe → enrich_llm → geocode → verify_score → upsert → reindex_search → refresh_jobs/news.
- `apps/web/lib/snapshot.ts` — **the hybrid switch**: build a city snapshot from Postgres (published+probable). Swap this one file for a bounds query at scale; UI unchanged.
- `apps/admin` — the control plane: bulk review/edit, add/remove, approve ads, stats, "run ingest" button, embed dashboards.

---

## 7. Data pipeline & free sources

**Sources (all free), prioritize incubators + Inc42 lists (active, high-signal) first:**
- DPIIT / data.gov.in (city-wise recognized startups) — seed list + badge
- MCA / CIN registry — legal entity verification
- Incubators: Bhau Institute (COEP), Venture Center (NCL Pune), MSInS, IIT-Bombay SINE, 91springboard
- News RSS: Inc42, YourStory, Entrackr
- Company websites — description, address, careers, HR emails
- OpenStreetMap + self-hosted Nominatim/Photon — geocoding
- indianstartupmap.com — cross-reference
- Community submissions — freshness

**Enrichment:** free/local LLM (Ollama) for descriptions + sector/stage classification, once per record, batched. Never invent facts → low confidence when unsure.

**Two rules that keep you clean:**
1. Publish only public business contacts with a stored `source_url` + one-tap opt-out — never residential MCA addresses.
2. Treat DPIIT as a discovery seed, not a census — cross-reference before publishing.

---

## 8. UI / entry flow

- **Screen 1 — City picker:** cards (Pune, Mumbai) + search + detect-location. Card → `/pune`. Non-live cities show "notify me".
- **Screen 2 — City map + grid:** control bar + clustered map + news panel + sponsor bar; filter/search in memory on the snapshot.
- **Screen 3 — Company profile (SSR):** precision-aware location, free contacts, real jobs, last-verified badge. SEO surface.

**Control bar:** logo · search (name/sector/founders) · All types/areas/stages/sectors (options from snapshot facets) · Map/Grid toggle · live jobs count · Submit. Search filters the in-memory snapshot (no server call); at scale it routes to Typesense — same bar.

---

## 9. Monetization (sequenced, pricing anchored to incumbent)

1. **Ads & boosted pins** — boosted pin ₹2,500/7d, sponsor tile ₹5,000/7d, flash ₹2,500/24h, banner. Manual UPI first, then self-serve Razorpay checkout.
2. **Jobs & walk-ins** — free basic; paid featured + walk-in cards.
3. **Recruiter subscriptions** — monthly SaaS (manage, claim, analytics).
4. **Paid connect** — intro/resume/referral via Route escrow, commission per delivery.

The **free HR/CEO contact directory** is not a revenue line — it's the traffic magnet that makes every paid pillar more valuable. Referrals are NOT front-and-centre.

---

## 10. Observability (free)

- **Product/traffic:** Cloudflare Web Analytics (visitors), PostHog (funnels + session replay, ~1M events/mo free), Google Search Console (search — your #1 channel). Add Microsoft Clarity (heatmaps), UptimeRobot (uptime), Sentry (errors).
- **Own `page_views` table** = first-party truth the admin/bot can read for `/stats`.
- **Infra/pipeline (optional):** Prometheus + Grafana on the laptop (Docker Compose with `postgres_exporter` + `node_exporter`) for ingest rate, review backlog, DB health. A simple log + alert is fine at first.

---

## 11. Telegram bot — OPTIONAL

Since we're building a professional admin panel, the interactive bot is **not required** — the
panel is the control plane. If you want phone convenience, keep only a **one-way notifier**
(~5 lines: a webhook that pings you when an ingest fails or the review backlog grows). If you
ever build the full interactive bot, use **webhook mode as a route in the Next.js app**
(`/api/telegram`) — more reliable than running it on a laptop that sleeps; the webhook queues a
job and the laptop pipeline picks it up when awake.

---

## 12. Laptop data engine — setup from scratch

```bash
# STEP 1 — Cloud database (Supabase or Neon), in its SQL editor / psql:
create extension if not exists postgis;
\i packages/db/schema.sql
\i packages/db/seed/cities.sql
# copy the POOLER connection string (port 6543):
# DATABASE_URL = postgres://…pooler…:6543/postgres?sslmode=require

# STEP 2 — Laptop toolchain (Linux shown; macOS=brew, Windows=WSL2)
sudo apt update && sudo apt -y upgrade
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash - && sudo apt -y install nodejs git
sudo npm i -g pnpm
curl -fsSL https://ollama.com/install.sh | sh && ollama pull llama3.2:1b   # optional local LLM

# STEP 3 — Repo + secrets (.env)
git clone <repo> startup-atlas && cd startup-atlas && pnpm install
# .env:
# DATABASE_URL=postgres://…pooler…:6543/postgres?sslmode=require
# LLM_BASE_URL=http://localhost:11434

# STEP 4 — First ingest & verify it stores
pnpm tsx services/pipeline/src/run.ts pune
psql "$DATABASE_URL" -c "select status, count(*) from brands group by status;"
```

**Two phases (this is why you don't cron the initial fill):**
- **Phase 1 — Backfill:** run continuously until ~1,000/city. `caffeinate -i pnpm tsx services/pipeline/src/run.ts pune` (macOS) / `systemd-inhibit --what=idle …` (Linux). No cron. Stop at target.
- **Phase 2 — Maintenance:** small scheduled refreshes only. Jobs daily, news daily, discovery weekly. Move these to a **free GitHub Actions cron** so freshness doesn't need the laptop awake.

**Updates after launch:** jobs = `refresh_jobs` re-visits careers pages, upserts new, expires unseen. news = `refresh_news` RSS. new startups = re-run discovery + community submissions + manual add in admin. existing = monthly liveness + funding/stage refresh.

**Laptop cautions:** wrap DB upserts in a retry + use the pooler URL (a wifi blip just pauses/resumes); manage sleep during backfill.

---

## 13. ⭐ BUILD ORDER — two tracks, side by side

> Start the **data engine (Track A) FIRST** so the database fills while you build the app
> (Track B) on top of it. By the time the UI is ready, the data is already there.

### Step 0 — Provision accounts (~30 min, once)
Supabase/Neon (DB), Cloudflare (R2 + Web Analytics), Vercel, a domain, PostHog, Google Search
Console. (Razorpay only when you reach payments in Step 7 — start its KYC then, it takes days.)

### Step 1 — Scaffold the monorepo (shared by both tracks)
`pnpm` workspace + `turbo`. Create `packages/{db,core,config}`, `services/pipeline`, `apps/web`,
`apps/admin`. Put the schema in `packages/db/schema.sql` and types/scoring/geo in `packages/core`.

### Step 2 — Database up (Track A)
Run the schema on the cloud DB, enable PostGIS, seed `cities` + `areas` (Pune, Mumbai centroids
in `packages/config/cities.ts`, mirrored into `packages/db/seed/cities.sql`).

### Step 3 — 🟢 START THE DATA ENGINE (Track A) — do this BEFORE building UI
1. Fill `packages/config/cities.ts` (centroids, bbox, discovery sources per city).
2. Write the pipeline for **ONE source end-to-end first** (an incubator portfolio or the Inc42
   Pune list): `sources/incubators.ts` → `steps/normalize` → `steps/geocode` (Nominatim +
   centroid fallback with honest precision) → `steps/verify_score` → `steps/upsert`.
3. Run the **backfill** on the laptop (`caffeinate …`). Let it collect Pune, then Mumbai, toward
   ~1,000 each. **This now runs in the background for hours/days while you do Track B.**

### Step 4 — Build the app on the filling database (Track B)
1. `packages/db` client + `apps/web/lib/queries.ts` + `lib/snapshot.ts` (the hybrid loader).
2. Next.js app: `app/page.tsx` city picker → `app/[city]/page.tsx` map + grid → `TopBar` control
   bar → `CityExplorer` (in-memory filter) → `MapView` (MapLibre + PMTiles, clustering,
   precision pins) → `company/[slug]` SSR profile.
3. `api/snapshot/[city]` (edge-cached thin payload) + sitemap/robots.

### Step 5 — Add more sources (Track A, ongoing in background)
Add DPIIT, MCA, news RSS, company-site scraping to `sources/*`. Keep backfilling; QA the
`review` tier in the admin panel as records land.

### Step 6 — Contacts, jobs, news, admin panel
Free contact directory on profiles (`company_contacts`, public + opt-out). `job_postings` +
`[city]/jobs`. `NewsPanel`. Build `apps/admin` (review/edit/add/approve + run-ingest button) —
this replaces the Telegram bot as the control plane.

### Step 7 — Monetization
Ad surfaces (`SponsorBar`, `AdSlot`, `api/ads`) + advertise & submit/claim forms (manual UPI →
bot/admin approve). Start Razorpay KYC now; add self-serve checkout + `webhooks/razorpay` when
active. Subscriptions + paid connect (escrow) come after.

### Step 8 — Observability, legal, deploy, launch
Wire Cloudflare + PostHog + Search Console + `page_views`. Add privacy/terms pages. Trust polish
(precision labels, verified badges, hide review/archived tiers). Perf (edge cache, logo cache).
Deploy to Vercel + domain. Final QA both cities. Launch posts for Pune + Mumbai.

### Step 9 — Flip pipeline to maintenance mode
Once backfilled, move the small refresh jobs (jobs/news/discovery) to GitHub Actions cron. At
scale, flip a busy city's `useBounds` flag → `api/bounds` + Typesense (no UI change).

---

## 14. Cut-lines (if behind, drop from the TOP; never cut trust)
1. Warm-path graph UI  2. Recruiter subscriptions  3. Self-serve ad checkout (keep manual UPI)
4. Paid connect escrow (launch as "request an intro" waitlist)  5. Typesense (client filter is enough)
6. Interactive Telegram bot (admin panel covers it)  7. Mumbai (stagger a day — config flag, zero rework)

## 15. Risks & long poles
- **Razorpay activation** takes days → start KYC early; fall back to manual UPI + connect waitlist.
- **Data quality** is the real bottleneck → ship fewer, cleaner records over many dirty ones; start ingestion Day 0.
- **Nominatim rate limits** → batch + cache; area-centroid fallback with honest precision; self-host if needed.
- **Laptop sleep** → keep awake during backfill; move maintenance to cloud cron.

---

*End of brief. Build Track A first, then Track B on top. Keep data honest. Ship the hybrid fast.*

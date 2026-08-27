# Prompt for the Replit Agent — Startup Atlas ingestion

Paste everything below this line into the Replit Agent as your task instructions, after
cloning this repo into the Repl. It's written to be self-contained — the agent doesn't need
prior context on this project beyond what's here and what it reads in the repo itself.

---

## What this repo is

Startup Atlas is a city-by-city map of startups (Pune + Mumbai first). The full product spec
lives in `CLAUDE.md` at the repo root — read that first if anything here is ambiguous, it is
the source of truth. This prompt only covers the **data ingestion pipeline**, which is the one
piece of the system meant to run somewhere other than the deployed web app (originally spec'd
as "a spare laptop" — you (Replit) are now that machine).

The pipeline lives at `services/pipeline/` and does one job: turn messy public data about
startups into clean, honestly-scored rows in a shared Postgres database. Nothing you do here
touches the live website directly — you're only ever writing to the database that the website
later reads from.

**The one rule that overrides every other instruction in this document:** never invent a fact.
If you don't know a company's website, leave it blank — don't guess a plausible-looking domain.
If you can't find a real street address, don't fabricate coordinates — the pipeline already
falls back to an honestly-labeled city-centroid pin for exactly this case. This system's entire
competitive advantage over the incumbent it's replacing is that every fact is either sourced or
clearly marked as unknown. A wrong guess that looks confident is worse than an honest blank.

---

## 1. Environment setup

1. `pnpm install` at the repo root (this is a pnpm workspace monorepo — don't use npm/yarn).
2. Copy `.env.example` to `.env` at the repo root and fill in:
   - `DATABASE_URL` — you'll be given a Neon/Supabase pooler connection string (port 6543,
     `sslmode=require`) separately. This is the **only** required variable for ingestion to run.
   - `NOMINATIM_BASE_URL` / `NOMINATIM_USER_AGENT` — already filled in `.env.example` with
     sane defaults (the public OSM Nominatim instance). Leave as-is.
   - `LLM_BASE_URL` / `LLM_MODEL` — these point at a **local Ollama instance**
     (`http://localhost:11434`). You almost certainly don't have Ollama running on Replit. This
     is fine and expected — leave the variable unset or pointing at nothing. The pipeline
     degrades gracefully: `services/pipeline/src/steps/enrich_llm.ts` only calls this to fill in
     a missing description, and if the fetch fails it just skips enrichment for that record and
     moves on (see `[llm] enrichment skipped for "X": fetch failed` in the logs — that's normal,
     not a bug). Do not treat this as something to fix.
3. Verify the DB connection works before doing anything else:
   ```bash
   node --env-file=.env -e "
   const { Pool } = require('pg');
   new Pool({ connectionString: process.env.DATABASE_URL }).query('select count(*) from brands')
     .then(r => console.log('brands in DB:', r.rows[0].count));
   "
   ```

## 2. How to run ingestion

```bash
# Run every registered source for a city (see services/pipeline/src/sources/index.ts for the
# list). This is the main command you'll use.
pnpm --filter services-pipeline run start pune
pnpm --filter services-pipeline run start mumbai

# After any batch of new/updated brands lands, cache their logos locally
# (see "Logos" section below for why this matters and its one big caveat).
pnpm --filter services-pipeline run cache-logos

# Independent of the above — refreshes news article links, doesn't touch brands.
pnpm --filter services-pipeline run refresh-news pune
```

Each run logs one line per source (`found`, `upserted`, `needsReview`) and writes a row to the
`ingestion_runs` table so there's a durable record of what happened and when. Nothing here is
destructive — re-running the same source twice just re-upserts the same rows (matched by
`city_id + slug`), it never duplicates or blanks out previously-known facts (see the COALESCE
note under "How the pipeline works" below).

## 3. How the pipeline works (read before writing any code)

```
sources/*.ts  →  normalize  →  dedupe  →  enrich_llm  →  geocode  →  verify_score  →  upsert
```

Each stage is a small, independently-testable file in `services/pipeline/src/steps/`. The only
piece you'll normally touch is `sources/`.

**A "collector"** (`services/pipeline/src/sources/*.ts`) is a function with this shape:

```ts
export async function collectSomething(): Promise<RawRecord[]> { ... }
```

Its only job: fetch a page, pull out whatever fields are cheaply available, return
`RawRecord[]`. No normalizing, no scoring, no DB access — if a source's page changes shape or
goes down, only that one file breaks; every other source keeps working. `RawRecord` (defined in
`services/pipeline/src/types.ts`) is:

```ts
type RawRecord = {
  name: string;             // required — everything else is optional
  website?: string;
  tagline?: string;
  description?: string;
  address?: string;         // real street address only — see geocoding note below
  logoUrl?: string;         // a real hosted logo URL, if the source has one
  foundedYear?: number;
  sector?: string;
  sourceUrl: string;        // required — the exact page you scraped this from
  sourceName: string;       // required — a short slug identifying this source
};
```

Register a new collector in `services/pipeline/src/sources/index.ts`'s `collectors` array with
the city/cities it applies to. Three existing collectors to copy the shape from, roughly in
order of how much structure they rely on:
- `sources/incubators.ts` — plain HTML, cheerio, one CSS selector.
- `sources/inc42.ts` — plain HTML, but reads label/value pairs structurally (loops `<li>`
  elements and matches on the label text) instead of hardcoding a hashed CSS class name, since
  that class name is generated by Inc42's build tooling and changes on redeploy. Prefer this
  pattern over exact class-name selectors whenever a site's classes look auto-generated
  (long random-looking suffixes like `sc-1l3ua3h-7 kGHEJm`).
- `sources/wellfound.ts` — the interesting one. The page looks like a client-only React SPA at
  first glance, but is actually Next.js SSR with the real data embedded as a JSON blob in a
  `<script id="__NEXT_DATA__">` tag (an Apollo GraphQL cache). Parsing that JSON directly is far
  more robust than DOM-scraping generated class names. If a site you're investigating "looks
  like a SPA," always check view-source for `__NEXT_DATA__`, `__NUXT__`, `window.__INITIAL_STATE__`
  or similar embedded-state patterns before concluding it needs a headless browser — a lot of
  "SPAs" are actually SSR frameworks doing this.

**Geocoding:** if a `RawRecord` has a real `address`, `steps/geocode.ts` resolves it via
Nominatim into a precise pin. If it doesn't (true for both `wellfound.ts` and `inc42.ts` as
currently written — neither source exposes a street address), the record falls back to the
city's centroid with `precision` honestly downgraded to `synthetic`. This is a valid, intended
state, not a bug — but if you can cheaply find a real address for a specific company (e.g. by
visiting its own website's "Contact" or footer, or its Wellfound page directly), passing that
through as `address` on the `RawRecord` will get it a real, precise pin instead. Don't invent
one.

**Scoring & COALESCE:** `steps/verify_score.ts` scores every record 0–100 (weights live in
`packages/core`) and buckets it into `published` (75+) / `probable` (55–74) / `review` (35–54)
/ `archived` (<35, hidden but never deleted). `steps/upsert.ts` writes to the `brands` table
with `ON CONFLICT ... DO UPDATE`, and critically, three fields (`logo_url`, `founded_year`,
`sector`) use `COALESCE(new_value, existing_value)` rather than a flat overwrite — a less
informed source run can never blank out a fact a better source already established. If you
write a new collector or an enrichment script, follow this same pattern for any field you
touch: prefer the existing value's presence over letting an "unknown" clobber a "known."

## 4. The four sources you were given — current status

Two are built and working (verified against the live DB — 195 Wellfound + 25 Inc42 records
already landed as of this writing):

- **`https://wellfound.com/startups/location/pune`** → `sources/wellfound.ts`. Paginates through
  ~196 Pune startups, extracting name, real external website, tagline, description, and a real
  hosted logo URL straight out of the embedded Apollo cache.
- **`https://inc42.com/lists/top-30-funded-startups-in-pune-2026/`** → `sources/inc42.ts`.
  ~25 server-rendered entries with name, description, real logo, sector, and founding year.
  **Known gap: no external website URL is exposed anywhere on this listicle page** — every link
  points back to Inc42's own internal `/company/{slug}/` profile, not the startup's real site.
  This is exactly the kind of gap your own capabilities (web search) are well suited to close —
  see the "your main task" section below.

Two were investigated and are **not scrapable with a simple fetch** — this needs either your
judgment call on how much effort is worth spending, or a documented decision to skip them:

- **`https://jobs.punestartups.org/`** — returns a 200 but the HTML is a bare 484-byte Vite/React
  shell (`<div id="root"></div>` + one JS bundle). Zero server-rendered content — confirmed there
  is no `__NEXT_DATA__`-style escape hatch like Wellfound has. To get real data out of this
  you'd need to either (a) reverse-engineer its backend API by inspecting what XHR/fetch calls
  the bundled JS makes on page load (check the Network tab, or grep the JS bundle for `fetch(` /
  `axios` calls and a base API URL), or (b) run a headless browser (Playwright/Puppeteer) to
  render it and then scrape the DOM. Try (a) first — it's far cheaper and more stable than
  running a browser for every ingestion pass. If neither is quick to pull off, it's fine to skip
  this source entirely rather than sinking hours into it; leave a note in
  `services/pipeline/src/sources/index.ts` saying why.
- **`https://www.startupblink.com/top-startups/pune-in`** — returns HTTP 403 on a plain fetch,
  almost certainly Cloudflare or similar bot-protection. A realistic browser `User-Agent` header
  alone did not help (this was tested). This one is likely not worth the effort of trying to get
  past a real anti-bot layer for a handful of startup names — deprioritize or skip it, and say so
  in a comment where it would have been registered.

## 5. Your main task, beyond wiring up the two new collectors above

The user's own framing for this phase: *"scrape the startup name and as much info that can be
fetched simply, then [the agent] fetches the rest of the info themselves from Google/web
searches or something."* Concretely, once the two collectors above have run and landed data:

1. **Find missing websites for Inc42-sourced brands.** Query
   `select id, name from brands where website is null and id in (select entity_id from field_evidence where field='name' and source_url like '%inc42%')`
   (or simpler: join through — use whatever's convenient) and for each one, do a web search for
   "`{company name}` official website" and, if you find a confident match, update `website` (and
   derive `domain` the same way `steps/normalize.ts` does: hostname minus a leading `www.`).
   **Only write it if you're actually confident it's the right company** — a same-named but
   unrelated company is worse than leaving the field blank. Record where you got it: insert a
   row into `field_evidence` (`entity='brand', entity_id=<id>, field='website', value=<url>,
   source_url=<the search result you used>, confidence=<your best guess 0-100>`) so there's a
   trail, matching how every other fact in this system is sourced.
2. **Re-run scoring after filling gaps.** Filling in a website is exactly the kind of fact that
   can move a record from `archived`/`review` up to `probable`/`published` — after a batch of
   manual enrichment, either re-run the relevant collector (safe — COALESCE means it won't lose
   anything) or write a small one-off script that re-scores affected rows using the same
   `scoreRecord`/`tierFromScore` functions from `packages/core` and updates `brands.score` /
   `brands.status` directly. Don't hand-pick statuses — always derive them from the same scoring
   function everything else uses, or the tiers stop meaning anything.
3. **Same idea for `sector` / `founded_year` on any brand still missing them**, if a quick,
   confident web search turns it up. Same rule: source it, don't guess it, leave it blank over
   fabricating.

Don't spend effort inventing addresses for precise geocoding — `synthetic` precision (honest
city-centroid fallback) is an accepted, correctly-labeled state in this system, not a defect to
paper over.

## 6. Logos — how caching works and the one thing to know

`services/pipeline/src/lib/logos.ts` fetches a domain's favicon once (via
`icons.duckduckgo.com`) and saves it locally to `apps/web/public/logos/`, returning a path like
`/logos/example.com.png`. This happens two ways:
- **Automatically** — `steps/upsert.ts` calls it for any brand that lands without its own
  `logoUrl` from the source (Wellfound and Inc42 both already provide a real logo URL directly,
  so this mostly fires for sources like `venture-center` that don't).
- **Manually / in bulk** — `pnpm --filter services-pipeline run cache-logos` sweeps every brand
  with a known `domain` and backfills any still missing a `logo_url`.

**The one thing you must know:** `apps/web/public/logos/` is deliberately `.gitignore`d (see the
comment right above it in `.gitignore`) — these cached files are not meant to be committed to
git. In production this directory is supposed to be swapped for Cloudflare R2 (same pattern
already used for the self-hosted map tiles, see `infra/pmtiles/README.md`), because Vercel's
serverless functions can't write to a local filesystem at runtime. If you're just running
ingestion here on Replit to populate the shared database, this doesn't block you — the DB row's
`logo_url` still gets set correctly, and whoever handles the actual web deploy will wire up the
R2 swap separately. Don't try to route around the gitignore by force-adding the folder; that's
solving the wrong problem.

## 7. Non-negotiables (repeating this because it matters more than speed)

- Never fabricate a website, address, sector, founding year, or any other fact. Blank beats
  wrong, every time.
- Every fact you personally add (not just what a collector scrapes) needs a `field_evidence`
  row with a real `source_url` you actually looked at.
- Never publish a residential address — only public business addresses (office, coworking
  space, registered commercial address).
- Never hand-set a `brands.status` — it's always derived from `tierFromScore(score)` in
  `packages/core`, so the tiers stay meaningful across the whole dataset.
- `packages/db` is the only place SQL/schema lives. If you think you need a schema change, stop
  and flag it rather than improvising a migration — this is a shared production database.
- Don't touch `apps/web` or `apps/admin` for this task — this phase is data-only. The website
  already knows how to read whatever lands in the `brands`/`offices`/`field_evidence` tables.

## 8. Sanity-check your work when done

```bash
node --env-file=.env -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
(async () => {
  console.log(await pool.query('select status, count(*) from brands group by status'));
  console.log(await pool.query(\"select source, sum(found) f, sum(upserted) u from ingestion_runs group by source\"));
  await pool.end();
})();
"
```

Report back: how many brands per status tier, how many records each source contributed, and a
short list of anything you skipped and why (e.g. "didn't crack punestartups.org's backend API,
here's what I tried").

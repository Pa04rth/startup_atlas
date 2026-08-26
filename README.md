# Startup Atlas

City-by-city map of startups (Pune, Mumbai first). See [CLAUDE.md](./CLAUDE.md) for the full
build plan, schema, and architecture.

## Layout

- `apps/web` — public Next.js product
- `apps/admin` — control plane (review/edit/approve/run-ingest)
- `services/pipeline` — ingestion pipeline, runs on the ingestion laptop
- `services/bot` — optional one-way Telegram notifier
- `services/monitoring` — optional Prometheus + Grafana
- `packages/db` — schema, migrations, seed data, queries (the only place SQL lives)
- `packages/core` — shared types, verification scoring, geo/precision, slug, taxonomy
- `packages/config` — cities, sectors, env, feature flags
- `infra` — PMTiles build, deploy, Nominatim

## Quick start

```bash
pnpm install
cp .env.example .env      # fill in DATABASE_URL etc.
psql "$DATABASE_URL" -f packages/db/schema.sql
psql "$DATABASE_URL" -f packages/db/seed/cities.sql
```

To run the ingestion pipeline (normally on the separate ingestion laptop):

```bash
pnpm --filter services-pipeline tsx src/run.ts pune
```

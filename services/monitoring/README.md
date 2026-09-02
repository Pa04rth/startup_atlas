# Monitoring (Prometheus + Grafana)

Optional, self-hosted (CLAUDE.md §10) — "a simple log + alert is enough at
first," this is here for when you want more than that: DB health, host
resources during a long backfill, and a few business-metric panels (review
backlog, pending payments, ingestion runs) read straight from the app's own
tables.

## 1. Create a read-only DB role (run this on neon.tech, once)

Never point monitoring at your app's owner credentials. In Neon's SQL
editor:

```sql
CREATE ROLE monitoring_readonly WITH LOGIN PASSWORD 'choose-a-strong-password';
GRANT CONNECT ON DATABASE neondb TO monitoring_readonly;
GRANT USAGE ON SCHEMA public TO monitoring_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO monitoring_readonly;
```

(Replace `neondb` with your actual database name if different — check
`select current_database();`.)

## 2. Fill in `.env` (repo root)

```
MONITORING_DATABASE_URL=postgres://monitoring_readonly:<password>@<your-neon-pooler-host>/neondb?sslmode=require
MONITORING_PG_HOST=<your-neon-pooler-host>:5432
MONITORING_PG_DATABASE=neondb
MONITORING_PG_USER=monitoring_readonly
MONITORING_PG_PASSWORD=<password>
GRAFANA_ADMIN_PASSWORD=<pick something>
```

Same pooler host as `DATABASE_URL`, different role/credentials.

## 3. Run it

```bash
cd services/monitoring
docker compose --env-file ../../.env up -d --build
```

Two things that matter here:
- `--env-file ../../.env` — without it, docker compose looks for a `.env`
  next to this `docker-compose.yml` (there isn't one) and the
  `${MONITORING_DATABASE_URL}`/`${GRAFANA_ADMIN_PASSWORD}` substitutions in
  the compose file resolve to empty.
- `--build` — prometheus and grafana build tiny local images that `COPY`
  in `prometheus.yml`/`grafana/provisioning` at build time, rather than
  bind-mounting them from the host. Docker Desktop for Windows has a real,
  reproducible bug bind-mounting a single file (or in one case a whole
  directory) into these images — `error mounting ... not a directory` for
  prometheus.yml, or Grafana silently seeing an empty provisioning folder.
  Building instead of bind-mounting sidesteps it entirely. **Re-run with
  `--build` any time you edit `prometheus/prometheus.yml` or anything
  under `grafana/provisioning/`** — those changes won't show up otherwise,
  since they're baked into the image now, not read live off disk.

- Grafana: http://localhost:3001 (login `admin` / your `GRAFANA_ADMIN_PASSWORD`)
- Prometheus: http://localhost:9090
- The "Startup Atlas" dashboard is provisioned automatically — review
  backlog, pending payments, 7-day page views, ingestion runs, Postgres
  connections, host load.

## What's wired to what

- `postgres_exporter` → Prometheus: DB-internal stats (connections, cache
  hit ratio) — infra health, not business metrics.
- `node_exporter` → Prometheus: host CPU/RAM/disk — useful while a backfill
  is running on your laptop.
- Grafana's own Postgres datasource (`grafana/provisioning/datasources/`)
  queries the app's tables directly with hand-written SQL — this is how
  the review-backlog/ingestion-runs panels work, not through an exporter.

## Removing it

```bash
docker compose down -v
```

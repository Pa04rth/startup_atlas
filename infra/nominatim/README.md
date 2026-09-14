# Self-hosted Nominatim

Only set this up once the **public** instance's rate limit
(`nominatim.openstreetmap.org`, 1 request/sec, already what
`services/pipeline/src/lib/nominatim.ts` + `steps/geocode.ts` use by default)
is an actual bottleneck — CLAUDE.md §15 flags this explicitly as a
later/only-if-needed step, not a launch requirement. At current data volumes
(low hundreds of geocodes per city per run) the public instance has been
fine.

This is **entirely separate infrastructure** from the app's Neon database —
it runs its own local Postgres+PostGIS container holding imported OSM data.
No SQL to run on Neon, nothing shared with the app's schema.

## Setup

```bash
cd infra/nominatim
docker compose up -d
```

First import takes a few hours for the India extract, which covers Pune,
Mumbai and Bengaluru (depends on host CPU/disk; budget ~40GB) — it's importing and indexing real OSM data, not
just starting a server. Watch progress with `docker compose logs -f`.

Once it's up, verify:

```bash
curl "http://localhost:8080/search?q=Koregaon+Park,+Pune&format=json"
curl "http://localhost:8080/search?q=Koramangala,+Bengaluru&format=json"
```

## Pointing the pipeline at it

In your `.env` (repo root):

```
NOMINATIM_BASE_URL=http://localhost:8080
```

(Or the host's real address if this runs on a different machine than the
pipeline — e.g. `http://100.x.x.x:8080` over a Tailscale/VPN link, or
whatever's reachable from wherever `pnpm run start`/the GitHub Actions
runners execute. GitHub-hosted runners can't reach a `localhost:8080` on
your machine — if you want CI's `discovery.yml`/scheduled runs to use your
self-hosted instance too, it needs to be reachable from the public internet,
which is a bigger step than running this for local backfills only.)

## Staying current

`REPLICATION_URL` in `docker-compose.yml` points at Geofabrik's India
diff feed — the image's built-in `nominatim replication` tooling can apply
these incrementally so the local data doesn't go stale. Not automated here;
see the [mediagis/nominatim-docker docs](https://github.com/mediagis/nominatim-docker)
if you want that running on a schedule.

## Removing it

```bash
docker compose down -v   # -v also drops the imported data volume
```

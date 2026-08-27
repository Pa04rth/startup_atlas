// The only step that touches the database. Wrapped in withRetry so a wifi
// blip on the ingestion laptop pauses and resumes instead of losing a record
// (CLAUDE.md section 12). Offices are replaced (not appended) on every run,
// since this pipeline is the source of truth for pin location until an
// admin manually overrides it.
import { getPool } from "@startup-atlas/db";
import { withRetry } from "../lib/retry";
import { fetchAndCacheLogo } from "../lib/logos";
import type { ScoredRecord } from "../types";

export async function upsert(records: ScoredRecord[], cityId: string): Promise<{ upserted: number }> {
  const pool = getPool();
  let upserted = 0;

  for (const record of records) {
    await withRetry(() => upsertOne(pool, record, cityId));
    upserted++;
  }

  return { upserted };
}

async function upsertOne(pool: ReturnType<typeof getPool>, record: ScoredRecord, cityId: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const brandRes = await client.query(
      // logo_url/founded_year use COALESCE on conflict, not a plain
      // overwrite — a source run that doesn't know a fact should never blank
      // out one a previous run (or steps/upsert-time logo caching, see
      // cache-logos.ts) already established.
      `INSERT INTO brands (city_id, slug, name, tagline, description, website, domain, logo_url, founded_year, sector, score, status, last_verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now())
       ON CONFLICT (city_id, slug) DO UPDATE SET
         tagline = EXCLUDED.tagline, description = EXCLUDED.description,
         website = EXCLUDED.website, domain = EXCLUDED.domain,
         logo_url = COALESCE(EXCLUDED.logo_url, brands.logo_url),
         founded_year = COALESCE(EXCLUDED.founded_year, brands.founded_year),
         sector = COALESCE(EXCLUDED.sector, brands.sector),
         score = EXCLUDED.score, status = EXCLUDED.status,
         last_verified_at = now(), updated_at = now()
       RETURNING id`,
      [
        cityId,
        record.slug,
        record.name,
        record.tagline ?? null,
        record.description ?? null,
        record.website ?? null,
        record.domain ?? null,
        record.logoUrl ?? null,
        record.foundedYear ?? null,
        record.sector ?? null,
        record.score,
        record.status,
      ]
    );
    const brandId = brandRes.rows[0].id as string;

    await client.query(`DELETE FROM offices WHERE brand_id = $1`, [brandId]);
    await client.query(
      `INSERT INTO offices (brand_id, city_id, geom, precision, location_source)
       VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3,$4), 4326), $5, $6)`,
      [brandId, cityId, record.lng, record.lat, record.precision, record.locationSource]
    );

    await client.query(
      `INSERT INTO field_evidence (entity, entity_id, field, value, source_url, confidence)
       VALUES ('brand', $1, 'name', $2, $3, $4)`,
      [brandId, record.name, record.sourceUrl, record.score]
    );

    await client.query("COMMIT");

    // Only when the source didn't already hand us a real logo (e.g.
    // sources/inc42.ts does) — fetchAndCacheLogo checks its own local cache
    // first, so this is a no-op network-wise for a domain already cached
    // from a previous run. Runs after COMMIT, deliberately outside the
    // transaction: a network fetch has no business holding a DB connection
    // open, and a failed/slow logo fetch must never roll back the brand
    // write that already succeeded.
    if (!record.logoUrl && record.domain) {
      const cachedPath = await fetchAndCacheLogo(record.domain);
      if (cachedPath) {
        await pool.query(`UPDATE brands SET logo_url = COALESCE(logo_url, $2) WHERE id = $1`, [brandId, cachedPath]);
      }
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

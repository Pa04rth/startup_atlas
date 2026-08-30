import pg from "pg";
import fs from "fs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const PRECISION_WEIGHTS = { exact: 18, building: 18, street: 18, locality: 6, area: 6, city: 0, synthetic: 0 };
function scoreRecord({ hasWebsite, hasDomain, hasSector, hasStage, descriptionLength, hasFoundedYear, precision, seenInSourceCount }) {
  let score = 0;
  if (hasWebsite) score += 20;
  if (hasDomain) score += 8;
  if (hasSector) score += 8;
  if (hasStage) score += 8;
  if (descriptionLength > 40) score += 8;
  if (hasFoundedYear) score += 6;
  score += PRECISION_WEIGHTS[precision] ?? 0;
  if (seenInSourceCount >= 2) score += 6;
  return Math.min(score, 100);
}
function tierFromScore(score) {
  if (score >= 75) return "published";
  if (score >= 55) return "probable";
  if (score >= 35) return "review";
  return "archived";
}

const NOMINATIM_UA = "startup-atlas/0.1 (data-classification-pass)";
const geocodeCache = new Map();
async function geocodeArea(area, cityName) {
  const key = `${area}|${cityName}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  const q = `${area}, ${cityName}, Maharashtra, India`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  await new Promise((r) => setTimeout(r, 1100));
  try {
    const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
    if (!res.ok) { geocodeCache.set(key, null); return null; }
    const rows = await res.json();
    if (!rows.length) { geocodeCache.set(key, null); return null; }
    const hit = { lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon) };
    geocodeCache.set(key, hit);
    return hit;
  } catch {
    geocodeCache.set(key, null);
    return null;
  }
}

const BATCHES = [
  { city: "pune", cityName: "Pune", n: 7 },
  { city: "pune", cityName: "Pune", n: 11 },
  { city: "pune", cityName: "Pune", n: 12 },
  { city: "pune", cityName: "Pune", n: 13 },
  { city: "pune", cityName: "Pune", n: 14 },
  { city: "pune", cityName: "Pune", n: 15 },
  { city: "pune", cityName: "Pune", n: 16 },
  { city: "pune", cityName: "Pune", n: 17 },
  { city: "mumbai", cityName: "Mumbai", n: 1 },
  { city: "mumbai", cityName: "Mumbai", n: 2 },
];

const SECTORS = new Set(["AI","Consumer","D2C","Deeptech","Edtech","Fintech","Gaming","Healthtech","Logistics","SaaS","Other"]);
const STAGES = new Set(["Pre-seed","Seed","Series A","Series B","Series C","Series C+","Bootstrapped","Acquired","Public"]);

const summary = { archived: 0, published: 0, probable: 0, review: 0, geocodeFailed: [], flaggedList: [] };

for (const { city, cityName, n } of BATCHES) {
  const file = `_results_${city}_${n}.json`;
  if (!fs.existsSync(file)) { console.log(`SKIP missing ${file}`); continue; }
  const entries = JSON.parse(fs.readFileSync(file, "utf8"));

  for (const e of entries) {
    const { rows } = await pool.query(
      `select id, website, domain, sector, stage, founded_year, kind, coalesce(length(description),0) as desc_len,
              (select precision from offices where brand_id = brands.id) as precision
       from brands where id = $1`,
      [e.id]
    );
    if (rows.length === 0) { console.log(`SKIP ${e.name} (${e.id}) not found in DB`); continue; }
    const b = rows[0];

    const sector = e.sector && SECTORS.has(e.sector) ? e.sector : b.sector;
    const stage = e.stage && STAGES.has(e.stage) ? e.stage : b.stage;
    const kind = e.type === "vc" ? "vc" : "startup";

    let precision = b.precision ?? "synthetic";
    let geo = null;
    if (!e.flagged && e.area) {
      geo = await geocodeArea(e.area, cityName);
      if (geo) precision = "area";
      else summary.geocodeFailed.push(`${e.name} (${e.area})`);
    }

    const score = scoreRecord({
      hasWebsite: !!b.website,
      hasDomain: !!b.domain,
      hasSector: !!sector,
      hasStage: !!stage,
      descriptionLength: b.desc_len,
      hasFoundedYear: !!b.founded_year,
      precision,
      seenInSourceCount: 1,
    });
    const status = e.flagged ? "archived" : tierFromScore(score);
    summary[status] = (summary[status] ?? 0) + 1;
    if (e.flagged) summary.flaggedList.push(`${e.name} [${city}] — ${e.note ?? ""}`);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `update brands set sector = $2, stage = $3, kind = $4, score = $5, status = $6, updated_at = now() where id = $1`,
        [e.id, sector, stage, kind, score, status]
      );
      if (geo && e.area) {
        await client.query(
          `update offices set area = $2, geom = ST_SetSRID(ST_MakePoint($3,$4), 4326),
             precision = 'area', location_source = $5, verified_at = now()
           where brand_id = $1`,
          [e.id, e.area, geo.lng, geo.lat, e.source_url]
        );
        await client.query(
          `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
           values ('brand', $1, 'area', $2, $3, $4)`,
          [e.id, e.area, e.source_url, score]
        );
      }
      if (e.sector && SECTORS.has(e.sector)) {
        await client.query(
          `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
           values ('brand', $1, 'sector', $2, $3, $4)`,
          [e.id, e.sector, e.source_url, score]
        );
      }
      if (e.stage && STAGES.has(e.stage)) {
        await client.query(
          `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
           values ('brand', $1, 'stage', $2, $3, $4)`,
          [e.id, e.stage, e.source_url, score]
        );
      }
      if (e.flagged) {
        await client.query(
          `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
           values ('brand', $1, 'location_mismatch', $2, $3, 0)`,
          [e.id, e.note ?? "flagged: not genuinely based in this city", e.source_url]
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`FAILED ${e.name} (${e.id}):`, err.message);
    } finally {
      client.release();
    }
  }
  console.log(`Applied batch ${city}_${n} (${entries.length} entries)`);
}

console.log("\n=== SUMMARY ===");
console.log(summary);

await pool.end();

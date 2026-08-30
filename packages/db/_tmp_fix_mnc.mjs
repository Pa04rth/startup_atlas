import pg from "pg";

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

const NOMINATIM_UA = "startup-atlas/0.1 (mnc-classification-fix)";
async function geocodeArea(area, cityName) {
  const q = `${area}, ${cityName}, Maharashtra, India`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
  await new Promise((r) => setTimeout(r, 1100));
  const res = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA } });
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows.length) return null;
  return { lat: parseFloat(rows[0].lat), lng: parseFloat(rows[0].lon) };
}

// city is needed for geocoding context
const MNCS = [
  { id: "53ae79c7-6a79-4899-bb38-e8cf6e857696", name: "Tech Mahindra", city: "Pune", area: "Erandwane", sector: "Other", stage: "Public", source_url: "https://www.mappls.com/wsycy1" },
  { id: "8d2eb235-7bc6-4e95-a551-ff15dfa09004", name: "UBS", city: "Pune", area: null, sector: "Fintech", stage: "Public", source_url: null },
  { id: "ffdfba51-a5a8-445e-aa0d-e6f4327c92fd", name: "Showpad", city: "Pune", area: "Balewadi", sector: "SaaS", stage: null, source_url: "https://www.showpad.com/careers" },
  { id: "5769cec9-e8aa-4818-a2fd-d5c5dc1c6638", name: "Google", city: "Mumbai", area: "Bandra Kurla Complex", sector: "Other", stage: "Public", source_url: "https://seosandwitch.com/list-of-google-offices-in-india/" },
  { id: "07215b1d-1b88-4afc-8ea9-01a816a946cc", name: "Amazon", city: "Mumbai", area: "Bandra Kurla Complex", sector: "Other", stage: "Public", source_url: "https://www.aboutamazon.in/workplace/corporate-offices" },
  { id: "f69a1310-1fbc-4f3e-897c-c586ec72c4ed", name: "Adobe", city: "Mumbai", area: "Bandra Kurla Complex", sector: "SaaS", stage: "Public", source_url: "https://www.adobe.com/in/about-adobe/contact/offices.html" },
  { id: "ecafc6e4-5a9f-4efe-9db3-7072cc9b320c", name: "JPMorgan Chase", city: "Mumbai", area: "Bandra Kurla Complex", sector: "Fintech", stage: "Public", source_url: "https://www.jpmorganchase.com/newsroom/press-releases/2023/jpmorgan-chase-opens-new-offices-in-mumbai-and-bengaluru" },
  { id: "8d787d3b-96db-4f51-8f98-f81fe9c4332e", name: "Capgemini", city: "Mumbai", area: "Vikhroli", sector: "Other", stage: null, source_url: "https://www.capgemini.com/in-en/careers/lets-connect/our-offices/capgemini-mumbai/" },
  { id: "cf6a6e9e-14a0-4f8d-9d33-0513e7dd4609", name: "Deloitte", city: "Mumbai", area: "Lower Parel", sector: "Other", stage: null, source_url: "https://www2.deloitte.com/in/en/footerlinks/office-locator.html" },
  { id: "f40b5fe9-c632-40fb-a558-ec65f5c1e174", name: "EY", city: "Mumbai", area: "Lower Parel", sector: "Other", stage: null, source_url: "https://www.ey.com/en_in/locations/india" },
];

for (const m of MNCS) {
  const { rows } = await pool.query(
    `select b.website, b.domain, b.founded_year, coalesce(length(b.description),0) as desc_len, o.precision
     from brands b left join offices o on o.brand_id = b.id where b.id = $1`,
    [m.id]
  );
  const b = rows[0];

  let precision = b.precision ?? "synthetic";
  let geo = null;
  if (m.area) {
    geo = await geocodeArea(m.area, m.city);
    if (geo) precision = "area";
  }

  const score = scoreRecord({
    hasWebsite: !!b.website,
    hasDomain: !!b.domain,
    hasSector: !!m.sector,
    hasStage: !!m.stage,
    descriptionLength: b.desc_len,
    hasFoundedYear: !!b.founded_year,
    precision,
    seenInSourceCount: 1,
  });
  const status = tierFromScore(score);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `update brands set kind = 'mnc', sector = $2, stage = $3, score = $4, status = $5, updated_at = now() where id = $1`,
      [m.id, m.sector, m.stage, score, status]
    );
    if (geo && m.area) {
      await client.query(
        `update offices set area = $2, geom = ST_SetSRID(ST_MakePoint($3,$4), 4326),
           precision = 'area', location_source = $5, verified_at = now()
         where brand_id = $1`,
        [m.id, m.area, geo.lng, geo.lat, m.source_url]
      );
    }
    await client.query(
      `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
       values ('brand', $1, 'kind', 'mnc', $2, $3)`,
      [m.id, m.source_url, score]
    );
    await client.query("COMMIT");
    console.log(`${m.name}: kind=mnc score=${score} status=${status} area=${m.area ?? "(unchanged)"}`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`FAILED ${m.name}:`, err.message);
  } finally {
    client.release();
  }
}

await pool.end();

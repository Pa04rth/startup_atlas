import pg from "pg";
import fs from "fs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  for (const city of ["pune", "mumbai"]) {
    const r = await client.query(
      `select b.id, b.name, b.website
       from brands b
       where b.city_id = $1 and b.status = 'review'
       order by b.name`,
      [city]
    );
    fs.writeFileSync(`_tmp_${city}_list.json`, JSON.stringify(r.rows));
    console.log(city, r.rows.length);
  }
} finally {
  client.release();
  await pool.end();
}

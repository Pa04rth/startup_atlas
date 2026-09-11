// Verifies only two things about every listed company: does its website
// actually work, and does anything on that website support the city we've
// filed it under. Nothing else is touched — tagline, sector, stage, logo,
// jobs and coordinates are all left exactly as they are, on the assumption
// that companies will correct their own page (see /manage/[city]/[slug]).
//
//   pnpm --filter services-pipeline run verify-listings <city> [--apply]
//
// Without --apply it only reports. With --apply it writes, and the only
// writes it ever makes are:
//   * status -> 'archived' for a website that is genuinely gone (DNS does
//     not resolve / connection refused / 404). Archived is hidden, never
//     deleted, so this is reversible from the admin review queue.
//   * a field_evidence row recording what was observed, so a later reviewer
//     can see why something was archived instead of guessing.
// A city mismatch is reported but NEVER auto-archived — "their homepage
// doesn't say Pune" is weak evidence on its own (plenty of real companies
// never name their city), so that stays a human decision.
import { getPool } from "@startup-atlas/db";
import { cities } from "@startup-atlas/config";

const CONCURRENCY = 6;
const FETCH_TIMEOUT_MS = 15000;
// A User-Agent alone isn't enough: pg.com and pratilipi.com both reset the
// connection when only UA is sent, and both return 200 once the rest of a
// normal browser's headers are present. Verified before relying on it —
// without this, live company sites get misread as dead.
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
};

// Other Indian metros, so "this site talks about Bengaluru and never
// mentions Pune" can be surfaced as a likely mis-filing rather than just
// "city not found".
const OTHER_CITIES = [
  "Bengaluru", "Bangalore", "Hyderabad", "Chennai", "Delhi", "Gurugram", "Gurgaon",
  "Noida", "Kolkata", "Ahmedabad", "Jaipur", "Indore", "Nashik", "Nagpur", "Surat",
  "Kochi", "Coimbatore", "Bhubaneswar", "Chandigarh", "Vadodara", "Thiruvananthapuram",
];

type Verdict =
  | "ok-city-confirmed"
  | "ok-city-not-mentioned"
  | "ok-other-city-only"
  | "dead-dns"
  | "dead-404"
  // Alive as far as anyone can tell, just not reachable from this machine.
  | "unreachable-reset"
  | "blocked"
  | "timeout"
  | "invalid-url"
  | "error";

// Only these are treated as "the website is genuinely gone". A refused or
// reset connection is deliberately NOT here: sanofi.com, nomuraholdings.com
// and lexisnexis.com all reset on us regardless of headers, and they are
// plainly not dead companies — that's a datacenter/WAF block, i.e. "we
// can't tell from here", which is not grounds for archiving anyone.
const DEAD: ReadonlySet<Verdict> = new Set(["dead-dns", "dead-404"]);

type Row = { id: string; name: string; website: string };
type Result = { row: Row; verdict: Verdict; detail: string | null };

async function check(row: Row, cityName: string): Promise<Result> {
  let origin: string;
  try {
    origin = new URL(row.website).origin;
  } catch {
    return { row, verdict: "invalid-url", detail: row.website };
  }

  let res: Response;
  try {
    res = await fetch(origin, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    const text = `${(err as Error).message} ${String((err as { cause?: unknown }).cause ?? "")}`;
    if (/timed? ?out|TimeoutError/i.test(text)) return { row, verdict: "timeout", detail: null };
    if (/ENOTFOUND|getaddrinfo/i.test(text)) return { row, verdict: "dead-dns", detail: origin };
    if (/ECONNREFUSED|ECONNRESET|EHOSTUNREACH|EPROTO|certificate|SSL|TLS/i.test(text)) {
      return { row, verdict: "unreachable-reset", detail: origin };
    }
    return { row, verdict: "error", detail: (err as Error).message.slice(0, 80) };
  }

  if (res.status === 404) return { row, verdict: "dead-404", detail: origin };
  if (res.status === 403 || res.status === 429) return { row, verdict: "blocked", detail: `HTTP ${res.status}` };
  if (!res.ok) return { row, verdict: "error", detail: `HTTP ${res.status}` };

  let html = "";
  try {
    html = await res.text();
  } catch {
    return { row, verdict: "error", detail: "body read failed" };
  }
  const text = html.replace(/<[^>]+>/g, " ");

  if (new RegExp(`\\b${cityName}\\b`, "i").test(text)) {
    return { row, verdict: "ok-city-confirmed", detail: null };
  }
  const others = OTHER_CITIES.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
  if (others.length > 0) {
    return { row, verdict: "ok-other-city-only", detail: others.slice(0, 3).join(", ") };
  }
  return { row, verdict: "ok-city-not-mentioned", detail: null };
}

async function main() {
  const cityId = process.argv[2];
  const apply = process.argv.includes("--apply");
  const city = cities.find((c) => c.id === cityId);
  if (!city) {
    console.error(`Usage: tsx src/verify-listings.ts <${cities.map((c) => c.id).join("|")}> [--apply]`);
    process.exit(1);
  }

  // Pulled out as a plain string: the closure below loses the
  // post-guard narrowing on `city` itself.
  const cityName = city.name;

  const pool = getPool();
  const { rows } = await pool.query<Row>(
    `select id, name, website from brands
     where city_id = $1 and status in ('published','probable') and website is not null
     order by name`,
    [cityId]
  );
  console.log(
    `[verify] ${rows.length} listed ${cityName} companies — checking website + city only` +
      `${apply ? " (--apply: dead sites will be archived)" : " (report only)"}\n`
  );

  const results: Result[] = new Array(rows.length);
  let next = 0;
  async function worker() {
    while (next < rows.length) {
      const i = next++;
      results[i] = await check(rows[i], cityName);
      if ((i + 1) % 100 === 0) console.log(`[verify]   ...${i + 1}/${rows.length}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker));

  const tally = new Map<Verdict, number>();
  for (const r of results) tally.set(r.verdict, (tally.get(r.verdict) ?? 0) + 1);

  console.log("\n[verify] results:");
  for (const [verdict, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(5)}  ${verdict}`);
  }

  const dead = results.filter((r) => DEAD.has(r.verdict));
  const wrongCity = results.filter((r) => r.verdict === "ok-other-city-only");

  console.log(`\n[verify] dead websites (${dead.length}):`);
  for (const r of dead.slice(0, 40)) console.log(`  ${r.row.name} — ${r.verdict} (${r.detail})`);
  if (dead.length > 40) console.log(`  ...and ${dead.length - 40} more`);

  console.log(`\n[verify] site names another city but never ${city.name} (${wrongCity.length}) — NOT auto-archived:`);
  for (const r of wrongCity.slice(0, 40)) console.log(`  ${r.row.name} — mentions ${r.detail}`);
  if (wrongCity.length > 40) console.log(`  ...and ${wrongCity.length - 40} more`);

  if (!apply) {
    console.log(`\n[verify] report only. Re-run with --apply to archive the ${dead.length} dead ones.`);
    await pool.end();
    return;
  }

  let archived = 0;
  for (const r of dead) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`update brands set status = 'archived', updated_at = now() where id = $1`, [r.row.id]);
      await client.query(
        `insert into field_evidence (entity, entity_id, field, value, source_url, confidence)
         values ('brand', $1, 'website_liveness', $2, $3, 0)`,
        [r.row.id, `${r.verdict}: ${r.detail ?? ""}`.slice(0, 300), r.row.website]
      );
      await client.query("COMMIT");
      archived++;
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[verify] failed to archive ${r.row.name}:`, (err as Error).message);
    } finally {
      client.release();
    }
  }
  console.log(`\n[verify] archived ${archived} companies with a dead website (reversible in /admin/review).`);
  await pool.end();
}

main().catch((err) => {
  console.error("[verify] fatal error", err);
  process.exit(1);
});

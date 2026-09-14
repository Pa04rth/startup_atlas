import { Pool } from "pg";

let pool: Pool | undefined;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    // Cap connections per serverless invocation — apps/web runs on Vercel,
    // where every function instance would otherwise open its own pool
    // against the same Postgres and can exhaust the connection limit even
    // through the pooler. Fine as-is for the pipeline (long-lived process).
    pool = new Pool({ connectionString, max: 5 });
    // Neon (and any pooler) closes idle connections. pg reports that as an
    // 'error' event on the pool, and an EventEmitter 'error' with no
    // listener crashes the whole process — which is how long pipeline runs
    // (cache-logos, import-bsm) died mid-way. The dead client is already
    // discarded by the pool; the next query simply opens a fresh one.
    pool.on("error", (err) => {
      console.warn(`[db] idle connection dropped: ${err.message}`);
    });
  }
  return pool;
}

export * from "./queries/brands";
export * from "./queries/jobs";
export * from "./queries/contacts";
export * from "./queries/news";
export * from "./queries/ads";
export * from "./queries/payments";
export * from "./queries/admin";
export * from "./queries/referrals";

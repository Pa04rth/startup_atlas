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

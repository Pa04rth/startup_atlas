// Next.js only auto-loads .env files from its own app root (apps/web/), not
// the monorepo root where the shared .env actually lives — load it
// explicitly before Next reads any config. Node's built-in loader (20.12+),
// no dotenv dependency needed.
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(path.join(__dirname, "../../.env"));
} catch {
  // Missing in some environments (e.g. CI, or Vercel where real env vars
  // are injected directly) — that's fine, don't fail the build over it.
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace packages ship raw TypeScript (no build step — see their
  // package.json "main"), so Next has to transpile them itself. Miss this
  // and every import from @startup-atlas/* fails at build/dev time.
  transpilePackages: ["@startup-atlas/core", "@startup-atlas/config", "@startup-atlas/db"],
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The workspace packages ship raw TypeScript (no build step — see their
  // package.json "main"), so Next has to transpile them itself. Miss this
  // and every import from @startup-atlas/* fails at build/dev time.
  transpilePackages: ["@startup-atlas/core", "@startup-atlas/config", "@startup-atlas/db"],
};

export default nextConfig;

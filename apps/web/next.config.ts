import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Workspace packages (drizzle db, shared) must be transpiled for the client/server
  transpilePackages: ["@devflow/db", "@devflow/shared"],
  serverExternalPackages: ["pg", "better-auth", "ws"],
};

export default nextConfig;
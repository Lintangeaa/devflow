import type { NextConfig } from "next";

const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@devflow/db", "@devflow/shared"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["@analyst-platform/shared"],
  outputFileTracingRoot: resolve(__dirname, "../../"),
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;

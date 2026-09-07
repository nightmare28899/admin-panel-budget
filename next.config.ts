import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

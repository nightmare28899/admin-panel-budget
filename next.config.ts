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
  async headers() {
    // same-origin (Chrome's implicit default) blocks Firebase's signInWithPopup
    // from closing its own OAuth popup — allow-popups keeps isolation but permits that.
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

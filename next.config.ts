import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // proxy.ts clones request bodies; the default 10 MB cap truncated uploads.
    proxyClientMaxBodySize: "450mb",
  },
};

export default nextConfig;

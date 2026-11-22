import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["3000-agradowqg3gg53urm6g4qf2zoi.instabox.tech"],
  experimental: {
    // proxy.ts clones request bodies; the default 10 MB cap truncated uploads.
    proxyClientMaxBodySize: "450mb",
  },
};

export default nextConfig;

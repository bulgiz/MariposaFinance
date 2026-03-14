import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mariposa/ui", "@mariposa/core", "@mariposa/chain-adapters", "@mariposa/apy-engine"],
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push("pino-pretty", "encoding");
    return config;
  },
};

export default nextConfig;

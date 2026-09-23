import type { NextConfig } from "next";
import path from "node:path";

/**
 * @description Configuración Next.js para la UI de vesting (App Router).
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname),
  webpack: (config) => {
    config.externals = [...(config.externals ?? []), "pino-pretty", "encoding"];
    return config;
  },
};

export default nextConfig;

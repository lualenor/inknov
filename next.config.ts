import type { NextConfig } from "next";

// output: "standalone" solo cuando se pide (Docker/servidor propio);
// Vercel detecta y empaqueta por su cuenta.
const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;

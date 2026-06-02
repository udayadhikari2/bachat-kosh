import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // instrumentation.ts is auto-detected in Next.js 15+ (no config needed)
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;

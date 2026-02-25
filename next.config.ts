import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      // Allow access from local network devices (e.g. phone/tablet)
      allowedOrigins: ["192.168.1.62:3000", "localhost:3000"],
    },
  }
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    // Allow access from local network devices (e.g. phone/tablet)
    allowedDevOrigins: ["192.168.1.62:3000", "localhost:3000"],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  }
};

export default nextConfig;

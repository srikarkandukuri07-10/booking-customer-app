import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "localhost:3000",
    "localhost:3001",
    "localhost",
    "192.168.0.6:3000",
    "192.168.0.6:3001",
    "192.168.0.6",
    "192.168.140.1:3000",
    "192.168.140.1:3001",
    "192.168.140.1"
  ]
};

export default nextConfig;

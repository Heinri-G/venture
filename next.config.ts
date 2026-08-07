import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ss3.4sqi.net',
      },
      {
        protocol: 'https',
        hostname: 'fastly.4sqi.net',
      },
    ],
  },
};

export default nextConfig;

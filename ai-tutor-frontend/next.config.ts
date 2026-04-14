import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.4.175', 'localhost', '127.0.0.1'],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'https://ai-tutor-api-tavu.onrender.com/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;

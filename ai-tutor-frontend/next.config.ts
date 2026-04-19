import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.4.175', 'localhost', '127.0.0.1'],
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.4.175:8081/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  skipTrailingSlashRedirect: true,

  // Dev: cho phép access từ local network IPs
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: ['192.168.4.175', 'localhost', '127.0.0.1'],
  }),

  async rewrites() {
    // Production: NEXT_PUBLIC_API_URL được inject bởi Amplify env vars
    // Development: fallback về local backend
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;

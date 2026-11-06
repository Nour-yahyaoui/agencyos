import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['*.e2b.app', 'localhost', '127.0.0.1'],
  async rewrites() {
    const target = process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
    return [
      { source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` },
      { source: '/api/docs-json', destination: `${target}/api/docs-json` },
      { source: '/api/docs', destination: `${target}/api/docs` },
    ];
  },
};
export default nextConfig;

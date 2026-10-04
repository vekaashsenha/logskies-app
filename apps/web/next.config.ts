import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  transpilePackages: ['@logskies/domain', '@logskies/api', '@logskies/telemetry'],
  ...(process.env.LOGSKIES_STATIC_EXPORT === '1'
    ? { output: 'export' as const, images: { unoptimized: true } }
    : {}),
  poweredByHeader: false,
};
export default nextConfig;

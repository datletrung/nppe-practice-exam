import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const isProd = process.env.NODE_ENV === "production";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
});

const baseConfig: NextConfig = {
  devIndicators: false,
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "*",
      },
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
        ],
      }
    ];
  },
};

// Only enable PWA in production
export default isProd ? withPWA(baseConfig as any) : baseConfig;

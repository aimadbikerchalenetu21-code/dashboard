/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Suppress jose/next-auth Edge Runtime warnings (they are informational only)
  webpack(config) {
    config.resolve.fallback = { ...config.resolve.fallback, net: false, tls: false };
    return config;
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */

// URL du backend FastAPI (override en prod via BACKEND_URL).
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  async rewrites() {
    return [
      // Proxy : /api/chat -> {backend}/chat, /api/health -> {backend}/health, etc.
      { source: "/api/:path*", destination: `${BACKEND_URL}/:path*` },
    ];
  },
};

export default nextConfig;

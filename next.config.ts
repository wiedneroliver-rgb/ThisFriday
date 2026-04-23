import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["ilyhkkukapwbfhjzhyrq.supabase.co"],
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [
          { key: "Content-Type", value: "application/json" },
        ],
      },
    ];
  },
};

export default nextConfig;
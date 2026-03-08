import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ilyhkkukapwbfhjzhyrq.supabase.co",
      },
    ],
  },
};

export default nextConfig;
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
  async rewrites() {
    return [
      { source: "/scene/:id", destination: "/" },
      { source: "/post/:id", destination: "/" },
      { source: "/event/:id", destination: "/" },
      { source: "/user/:id", destination: "/" },
      { source: "/invite", destination: "/" },
    ];
  },
};

export default nextConfig;

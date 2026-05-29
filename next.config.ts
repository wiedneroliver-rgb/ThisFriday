import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["ilyhkkukapwbfhjzhyrq.supabase.co"],
  },
  async headers() {
    return [
      {
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
      {
        source: "/scene/:id*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/user/:id*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/post/:id*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/event/:id*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/invite",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;

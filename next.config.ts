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
  // Deep link routes now have real pages — no rewrites needed.
  // /scene/:id → app/scene/[sceneId] (redirects logged-in users to /events/:id)
  // /post/:id  → app/post/[id]       (redirects to /events/:id)
  // /event/:id → app/event/[id]      (Eventbrite event detail)
  // /user/:id  → app/user/[id]       (redirects to /profile/:id)
  async rewrites() {
    return [
      { source: "/invite", destination: "/" },
    ];
  },
};

export default nextConfig;

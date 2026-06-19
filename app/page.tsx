"use client";

import { useEffect } from "react";

// Middleware handles the redirect at the edge. This is a fallback only.
export default function Home() {
  useEffect(() => {
    window.location.href = "/feed";
  }, []);

  return (
    <div style={{
      background: "#080808", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: "16px",
    }}>
      <img src="/logo.png" alt="ThisFriday" style={{ width: 64, height: 64, borderRadius: "16px" }} />
      <span style={{
        fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.02em", color: "#F0EDE8",
        fontFamily: "var(--font-inter)",
      }}>
        ThisFriday
      </span>
    </div>
  );
}

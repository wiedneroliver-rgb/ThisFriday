"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase";

function HomeContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    // Fallback: if auth check hangs for 3s, go to login anyway
    const fallback = setTimeout(() => {
      window.location.href = ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login";
    }, 3000);

    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        clearTimeout(fallback);
        if (user) {
          window.location.href = "/feed";
        } else {
          window.location.href = ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login";
        }
      } catch {
        clearTimeout(fallback);
        window.location.href = "/login";
      }
    }
    checkAuth();

    return () => clearTimeout(fallback);
  }, [ref]);

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

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function AgeGatePage() {
  const router = useRouter();
  const { userId, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [declined, setDeclined] = useState(false);

  async function confirm() {
    if (!userId || loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ age_verified: true })
      .eq("id", userId);
    await refreshProfile();
    router.push("/onboarding/terms");
  }

  if (declined) {
    return (
      <div style={{
        background: "#080808", minHeight: "100vh", color: "#F0EDE8",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "40px 24px", textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "20px" }}>🚫</div>
        <h2 style={{ fontWeight: 800, fontSize: "1.5rem", marginBottom: "12px" }}>
          You must be 18+
        </h2>
        <p style={{ color: "rgba(240,237,232,0.5)", fontSize: "0.9rem", lineHeight: 1.6 }}>
          ThisFriday is only available to users who are 18 years of age or older.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#080808", minHeight: "100vh", color: "#F0EDE8",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "40px 24px",
    }}>
      <div style={{ maxWidth: "360px", width: "100%", textAlign: "center" }}>
        {/* Logo / Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: "24px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.5rem", margin: "0 auto 32px",
        }}>
          🎉
        </div>

        <h1 style={{
          fontWeight: 900, fontSize: "2rem", letterSpacing: "-0.03em",
          marginBottom: "12px",
        }}>
          Are you 18 or older?
        </h1>
        <p style={{
          color: "rgba(240,237,232,0.5)", fontSize: "0.95rem",
          lineHeight: 1.6, marginBottom: "40px",
        }}>
          ThisFriday is a nightlife app for adults. You must be 18 years of age or older to use this app.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <button
            onClick={confirm}
            disabled={loading}
            style={{
              background: "#F0EDE8", color: "#080808",
              border: "none", borderRadius: "14px",
              padding: "16px", fontWeight: 800,
              fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1, width: "100%",
            }}
          >
            {loading ? "Confirming..." : "Yes, I'm 18 or older"}
          </button>
          <button
            onClick={() => setDeclined(true)}
            style={{
              background: "rgba(255,255,255,0.06)",
              color: "rgba(240,237,232,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px", padding: "16px",
              fontWeight: 600, fontSize: "1rem",
              cursor: "pointer", width: "100%",
            }}
          >
            No, I&apos;m under 18
          </button>
        </div>
      </div>
    </div>
  );
}

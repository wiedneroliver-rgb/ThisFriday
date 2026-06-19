"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export default function OnboardingTermsPage() {
  const router = useRouter();
  const { userId, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) {
      setScrolled(true);
    }
  }

  async function accept() {
    if (!userId || loading) return;
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({ terms_accepted: true })
      .eq("id", userId);
    await refreshProfile();
    router.push("/onboarding/setup");
  }

  return (
    <div style={{
      background: "#080808", minHeight: "100vh", color: "#F0EDE8",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "56px 24px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{
          fontWeight: 900, fontSize: "1.8rem", letterSpacing: "-0.03em",
          margin: "0 0 6px",
        }}>
          Terms of Use
        </h1>
        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.85rem", margin: 0 }}>
          Please read and accept to continue
        </p>
      </div>

      {/* Scrollable terms content */}
      <div
        onScroll={handleScroll}
        style={{
          flex: 1, overflowY: "auto", padding: "24px 24px 120px",
          color: "rgba(240,237,232,0.7)", lineHeight: 1.7, fontSize: "0.9rem",
        }}
      >
        <p style={{ marginBottom: "20px" }}>
          Welcome to ThisFriday. By using our app, you agree to these terms. Please read them carefully.
        </p>

        {[
          { title: "1. Acceptance of Terms", body: "By accessing or using ThisFriday, you agree to be bound by these Terms of Use and all applicable laws and regulations." },
          { title: "2. Age Requirements", body: "You must be at least 18 years of age to use ThisFriday. By using the app, you represent that you are 18 years of age or older." },
          { title: "3. User Accounts", body: "You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You must provide accurate and complete information when creating your account." },
          { title: "4. User Content", body: "You retain ownership of content you post on ThisFriday. By posting content, you grant us a license to use, display, and distribute that content. You are solely responsible for the content you post." },
          { title: "5. Prohibited Conduct", body: "You agree not to harass, abuse, or harm other users; post illegal content; impersonate others; or engage in any activity that violates applicable laws or regulations." },
          { title: "6. Privacy", body: "Your use of ThisFriday is also governed by our Privacy Policy. We collect and use your information as described in that policy." },
          { title: "7. Events and Plans", body: "ThisFriday allows users to create and share social plans. We are not responsible for the content, safety, or legality of any events or plans created by users." },
          { title: "8. Limitation of Liability", body: "ThisFriday is provided 'as is' without warranties of any kind. We are not liable for any damages arising from your use of the app." },
          { title: "9. Termination", body: "We reserve the right to terminate or suspend your account at any time for violation of these terms or for any other reason at our sole discretion." },
        ].map((section) => (
          <div key={section.title} style={{ marginBottom: "24px" }}>
            <h3 style={{ color: "#F0EDE8", fontWeight: 700, fontSize: "0.95rem", margin: "0 0 8px" }}>
              {section.title}
            </h3>
            <p style={{ margin: 0 }}>{section.body}</p>
          </div>
        ))}

        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.8rem", marginTop: "24px" }}>
          Last updated: January 2025. Questions? Contact us at support@thisfriday.ca
        </p>
      </div>

      {/* Sticky accept button */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(8,8,8,0.97)", backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        padding: "16px 24px",
        paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
      }}>
        {!scrolled && (
          <p style={{
            textAlign: "center", fontSize: "0.78rem",
            color: "rgba(240,237,232,0.35)", margin: "0 0 12px",
          }}>
            Scroll down to read all terms
          </p>
        )}
        <button
          onClick={accept}
          disabled={loading}
          style={{
            width: "100%", background: scrolled ? "#F0EDE8" : "rgba(240,237,232,0.25)",
            color: scrolled ? "#080808" : "rgba(240,237,232,0.5)",
            border: "none", borderRadius: "14px", padding: "16px",
            fontWeight: 800, fontSize: "1rem",
            cursor: loading || !scrolled ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            transition: "all 0.2s",
          }}
        >
          {loading ? "Saving..." : "I Accept the Terms of Use"}
        </button>
      </div>
    </div>
  );
}

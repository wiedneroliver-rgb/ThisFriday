"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Suspense } from "react";

const IOS_STORE = "https://apps.apple.com/ca/app/thisfriday/id6760683323";

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

function InviteContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isIAB, setIsIAB] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const iab = /Instagram|FBAN|FBAV|FB_IAB/i.test(ua);
    setIsIOS(ios);
    setIsIAB(iab);
  }, []);

  useEffect(() => {
    if (!ref) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    supabase.from("profiles").select("display_name, avatar_url")
      .eq("id", ref).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [ref]);

  function openInApp() {
    const url = ref
      ? `thisfriday://invite?ref=${ref}`
      : "thisfriday://";
    window.location.href = url;
    setTimeout(() => { window.location.href = IOS_STORE; }, 500);
  }

  const S = {
    page: {
      background: "#080808", color: "#F0EDE8", minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "2rem", fontFamily: "var(--font-inter)",
    },
    inner: {
      maxWidth: "320px", width: "100%",
      display: "flex", flexDirection: "column" as const,
      alignItems: "center", textAlign: "center" as const, gap: "1.5rem",
    },
    wordmark: {
      fontWeight: 800, fontSize: "1.75rem", letterSpacing: "-0.02em", color: "#F0EDE8",
    },
    avatar: {
      width: "72px", height: "72px", borderRadius: "50%",
      objectFit: "cover" as const, border: "1px solid rgba(240,237,232,0.1)",
    },
    avatarPlaceholder: {
      width: "72px", height: "72px", borderRadius: "50%",
      background: "rgba(240,237,232,0.08)", border: "1px solid rgba(240,237,232,0.1)",
    },
    heading: {
      fontWeight: 700, fontSize: "1.25rem", letterSpacing: "-0.01em",
      color: "#F0EDE8", margin: 0,
    },
    sub: { fontSize: "0.9375rem", color: "rgba(240,237,232,0.45)", margin: 0 },
    btn: {
      background: "#F0EDE8", color: "#080808", border: "none",
      borderRadius: "0.875rem", padding: "1rem", width: "100%",
      fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: "1rem", cursor: "pointer",
    },
    storeBtn: {
      background: "transparent", color: "rgba(240,237,232,0.5)",
      border: "1px solid rgba(240,237,232,0.15)", borderRadius: "0.875rem",
      padding: "0.875rem", width: "100%", fontFamily: "var(--font-inter)",
      fontWeight: 500, fontSize: "0.9375rem", cursor: "pointer",
    },
  };

  const inviterName = profile?.display_name;

  return (
    <main style={S.page}>
      <div style={S.inner}>
        <span style={S.wordmark}>ThisFriday</span>

        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt={inviterName ?? ""} style={S.avatar} />
          : <div style={S.avatarPlaceholder} />
        }

        <p style={S.heading}>
          {inviterName ? `${inviterName} invited you to ThisFriday` : "You've been invited to ThisFriday"}
        </p>
        <p style={S.sub}>See what your friends are doing this weekend.</p>

        {isIAB ? (
          <>
            <p style={{ ...S.heading, fontSize: "1.125rem" }}>Open in Safari to join</p>
            <p style={S.sub}>
              Tap <strong style={{ color: "#F0EDE8" }}>···</strong> then{" "}
              <strong style={{ color: "#F0EDE8" }}>Open in Browser</strong>
            </p>
          </>
        ) : isIOS ? (
          <>
            <button style={S.btn} onClick={openInApp}>Join ThisFriday</button>
            <button style={S.storeBtn} onClick={() => { window.location.href = IOS_STORE; }}>
              Download on App Store
            </button>
          </>
        ) : (
          <p style={S.sub}>Open this link on your iPhone to join.</p>
        )}
      </div>
    </main>
  );
}

export default function InvitePage() {
  return (
    <Suspense>
      <InviteContent />
    </Suspense>
  );
}

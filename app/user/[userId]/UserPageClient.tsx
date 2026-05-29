"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { createClient } from "@supabase/supabase-js";

const IOS_STORE = "https://apps.apple.com/ca/app/thisfriday/id6760683323";

type Profile = { display_name: string | null; avatar_url: string | null; bio: string | null };
type Environment = "ios-iab" | "ios" | "desktop";

export default function UserPageClient({ userId }: { userId: string }) {
  const [env, setEnv] = useState<Environment | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isIAB = /Instagram|FBAN|FBAV|FB_IAB/i.test(ua);
    if (!isIOS) setEnv("desktop");
    else if (isIAB) setEnv("ios-iab");
    else setEnv("ios");
  }, []);

  useEffect(() => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    supabase.from("profiles").select("display_name, avatar_url, bio").eq("id", userId).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [userId]);

  useEffect(() => {
    if (env !== "ios") return;
    window.location.href = `thisfriday://user/${userId}`;
  }, [env, userId]);

  useEffect(() => {
    if (env !== "desktop" || !scriptLoaded || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).QRCode(qrRef.current, {
      text: `https://thisfridayapp.com/user/${userId}`,
      width: 160, height: 160, colorDark: "#F0EDE8", colorLight: "#080808",
    });
  }, [env, scriptLoaded, userId]);

  function openInApp() {
    window.location.href = `thisfriday://user/${userId}`;
    setTimeout(() => { window.location.href = IOS_STORE; }, 500);
  }

  const S = {
    page: {
      background: "#080808", color: "#F0EDE8", minHeight: "100vh",
      display: "flex", flexDirection: "column" as const, alignItems: "center",
      justifyContent: "center", padding: "2rem 1.5rem", fontFamily: "var(--font-inter)",
    },
    inner: { width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column" as const, alignItems: "center", textAlign: "center" as const, gap: "1.5rem" },
    avatar: { width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover" as const, border: "1px solid rgba(240,237,232,0.1)" },
    avatarPlaceholder: { width: "80px", height: "80px", borderRadius: "50%", background: "rgba(240,237,232,0.08)", border: "1px solid rgba(240,237,232,0.1)" },
    name: { fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em", color: "#F0EDE8", margin: 0 },
    sub: { fontSize: "0.9375rem", color: "rgba(240,237,232,0.45)", margin: 0 },
    wordmark: { fontWeight: 800, fontSize: "0.8125rem", letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(240,237,232,0.3)" },
    btn: { background: "#F0EDE8", color: "#080808", border: "none", borderRadius: "0.875rem", padding: "1rem", width: "100%", fontFamily: "var(--font-inter)", fontWeight: 700, fontSize: "1rem", cursor: "pointer" },
    storeBtn: { background: "transparent", color: "rgba(240,237,232,0.5)", border: "1px solid rgba(240,237,232,0.15)", borderRadius: "0.875rem", padding: "0.875rem", width: "100%", fontFamily: "var(--font-inter)", fontWeight: 500, fontSize: "0.9375rem", cursor: "pointer" },
  };

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" onLoad={() => setScriptLoaded(true)} />
      <main style={S.page}>
        <div style={S.inner}>
          <span style={S.wordmark}>ThisFriday</span>
          {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.display_name ?? ""} style={S.avatar} /> : <div style={S.avatarPlaceholder} />}
          {profile?.display_name && <p style={S.name}>{profile.display_name}</p>}
          {profile?.bio && <p style={S.sub}>{profile.bio}</p>}

          {env === "ios-iab" ? (
            <>
              <p style={{ ...S.name, fontSize: "1.25rem" }}>Open in Safari to add them</p>
              <p style={S.sub}>Tap <strong style={{ color: "#F0EDE8" }}>···</strong> then <strong style={{ color: "#F0EDE8" }}>Open in Browser</strong></p>
            </>
          ) : env === "desktop" ? (
            <>
              <p style={S.sub}>Scan to open on your phone</p>
              <div ref={qrRef} style={{ padding: "1.25rem", background: "#080808", borderRadius: "1rem", border: "1px solid rgba(240,237,232,0.1)", minWidth: "160px", minHeight: "160px" }} />
            </>
          ) : (
            <>
              <button style={S.btn} onClick={openInApp}>Add as Friend</button>
              <button style={S.storeBtn} onClick={() => { window.location.href = IOS_STORE; }}>Download ThisFriday</button>
            </>
          )}
        </div>
      </main>
    </>
  );
}

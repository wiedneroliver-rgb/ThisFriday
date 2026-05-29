"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const IOS_STORE = "https://apps.apple.com/ca/app/thisfriday/id6760683323";

export default function EventPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [isIOS, setIsIOS] = useState(false);
  const [isIAB, setIsIAB] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua);
    const iab = /Instagram|FBAN|FBAV|FB_IAB/i.test(ua);
    setIsIOS(ios);
    setIsIAB(iab);
    if (ios && !iab) window.location.href = `thisfriday://event/${eventId}`;
  }, [eventId]);

  function openInApp() {
    window.location.href = `thisfriday://event/${eventId}`;
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
    tagline: { fontSize: "0.9375rem", color: "rgba(240,237,232,0.45)", margin: 0 },
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

  return (
    <main style={S.page}>
      <div style={S.inner}>
        <span style={S.wordmark}>ThisFriday</span>
        <p style={S.tagline}>See what&apos;s happening tonight.</p>

        {isIAB ? (
          <>
            <p style={{ ...S.tagline, color: "#F0EDE8", fontWeight: 700, fontSize: "1.25rem" }}>
              Open in Safari to continue
            </p>
            <p style={S.tagline}>
              Tap <strong style={{ color: "#F0EDE8" }}>···</strong> then{" "}
              <strong style={{ color: "#F0EDE8" }}>Open in Browser</strong>
            </p>
          </>
        ) : isIOS ? (
          <>
            <button style={S.btn} onClick={openInApp}>Open in ThisFriday</button>
            <button style={S.storeBtn} onClick={() => { window.location.href = IOS_STORE; }}>
              Download ThisFriday
            </button>
          </>
        ) : (
          <p style={S.tagline}>Open this link on your iPhone to continue.</p>
        )}
      </div>
    </main>
  );
}

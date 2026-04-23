"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useParams } from "next/navigation";

const IOS_STORE = "https://apps.apple.com/ca/app/thisfriday/id6760683323";

const AVATAR_COUNT = 4;

export default function ScenePage() {
  const params = useParams();
  const sceneId = params.sceneId as string;
  const [isDesktop, setIsDesktop] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = isIOS;

    if (!isMobile) {
      setIsDesktop(true);
      return;
    }

    window.location.href = `thisfriday://scene/${sceneId}`;

    const timer = setTimeout(() => {
      window.location.href = IOS_STORE;
    }, 2000);

    return () => clearTimeout(timer);
  }, [sceneId]);

  useEffect(() => {
    if (!isDesktop || !scriptLoaded || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).QRCode(qrRef.current, {
      text: `https://thisfridayapp.com/scene/${sceneId}`,
      width: 160,
      height: 160,
      colorDark: "#F0EDE8",
      colorLight: "#080808",
    });
  }, [isDesktop, scriptLoaded, sceneId]);

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"
        onLoad={() => setScriptLoaded(true)}
      />

      <main
        style={{
          background: "#080808",
          color: "#F0EDE8",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          position: "relative",
        }}
      >
        {/* radial glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "320px",
            background:
              "radial-gradient(ellipse at top, rgba(255,255,255,0.04) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "1.5rem",
            maxWidth: "320px",
            width: "100%",
          }}
        >
          {/* wordmark */}
          <span
            style={{
              fontFamily: "var(--font-inter)",
              fontWeight: 800,
              fontSize: "1.75rem",
              letterSpacing: "-0.02em",
              color: "#F0EDE8",
            }}
          >
            ThisFriday
          </span>

          {isDesktop ? (
            /* ── Desktop state ── */
            <>
              <p
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: 700,
                  fontSize: "1.5rem",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                  color: "#F0EDE8",
                  margin: 0,
                }}
              >
                Open this on your phone
              </p>

              <p
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: 300,
                  fontSize: "0.9375rem",
                  color: "rgba(240,237,232,0.5)",
                  margin: 0,
                }}
              >
                ThisFriday is a mobile app.
              </p>

              <div
                ref={qrRef}
                style={{
                  padding: "1.25rem",
                  background: "#080808",
                  borderRadius: "1rem",
                  border: "1px solid rgba(240,237,232,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "160px",
                  minHeight: "160px",
                }}
              />
            </>
          ) : (
            /* ── Mobile loading state ── */
            <>
              {/* friend avatars */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {Array.from({ length: AVATAR_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "rgba(240,237,232,0.1)",
                      border: "1px solid rgba(240,237,232,0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle cx="12" cy="8" r="4" fill="rgba(240,237,232,0.25)" />
                      <path
                        d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
                        stroke="rgba(240,237,232,0.25)"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <p
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontWeight: 700,
                    fontSize: "1.25rem",
                    letterSpacing: "-0.01em",
                    color: "#F0EDE8",
                    margin: 0,
                  }}
                >
                  Opening scene…
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-inter)",
                    fontWeight: 300,
                    fontSize: "0.875rem",
                    color: "rgba(240,237,232,0.4)",
                    margin: 0,
                  }}
                >
                  Taking you to the app
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

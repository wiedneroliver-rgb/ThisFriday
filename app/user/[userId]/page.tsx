"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useParams } from "next/navigation";

const IOS_STORE = "https://apps.apple.com/ca/app/thisfriday/id6760683323";

export default function UserPage() {
  const params = useParams();
  const userId = params.userId as string;
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isIAB = /Instagram|FBAN|FBAV|FB_IAB/i.test(ua);

    if (!isIOS) {
      setIsDesktop(true);
      return;
    }

    if (isIAB) {
      setIsInAppBrowser(true);
      return;
    }

    window.location.href = `thisfriday://user/${userId}`;

    const timer = setTimeout(() => {
      window.location.href = IOS_STORE;
    }, 2000);

    return () => clearTimeout(timer);
  }, [userId]);

  useEffect(() => {
    if (!isDesktop || !scriptLoaded || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).QRCode(qrRef.current, {
      text: `https://thisfridayapp.com/user/${userId}`,
      width: 160,
      height: 160,
      colorDark: "#F0EDE8",
      colorLight: "#080808",
    });
  }, [isDesktop, scriptLoaded, userId]);

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
          ) : isInAppBrowser ? (
            <>
              <p
                style={{
                  fontFamily: "var(--font-inter)",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  letterSpacing: "-0.02em",
                  lineHeight: 1.2,
                  color: "#F0EDE8",
                  margin: 0,
                }}
              >
                Open in Safari to continue
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
                Tap <strong style={{ color: "#F0EDE8" }}>···</strong> then{" "}
                <strong style={{ color: "#F0EDE8" }}>Open in Browser</strong>
              </p>
            </>
          ) : (
            <>
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
                  Opening profile…
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

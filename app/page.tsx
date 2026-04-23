import Link from "next/link";

export default function Home() {
  return (
    <main
      className="relative min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#080808", color: "#F0EDE8" }}
    >
      {/* radial glow at top */}
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
        <h1
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: 800,
            fontSize: "clamp(2.5rem, 10vw, 3.5rem)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "#F0EDE8",
            margin: 0,
          }}
        >
          ThisFriday
        </h1>

        <p
          style={{
            fontFamily: "var(--font-inter)",
            fontWeight: 300,
            fontSize: "1.0625rem",
            color: "rgba(240,237,232,0.6)",
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          See where your friends are going.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            width: "100%",
            marginTop: "0.5rem",
          }}
        >
          <a
            href="https://apps.apple.com/ca/app/thisfriday/id6760683323"
            className="tf-btn-primary"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            Download on the App Store
          </a>

        </div>
      </div>

      <footer
        style={{
          position: "absolute",
          bottom: "2rem",
          display: "flex",
          gap: "1.5rem",
          fontFamily: "var(--font-inter)",
          fontWeight: 300,
          fontSize: "0.75rem",
          color: "rgba(240,237,232,0.35)",
        }}
      >
        <Link href="/privacy" className="tf-footer-link">
          Privacy Policy
        </Link>
        <Link href="/terms" className="tf-footer-link">
          Terms of Service
        </Link>
      </footer>
    </main>
  );
}

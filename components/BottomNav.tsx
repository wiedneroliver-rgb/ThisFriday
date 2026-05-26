"use client";

import Link from "next/link";
import Image from "next/image";

type Tab = "feed" | "discover" | "friends" | "events" | "profile";

const tabs: { id: Tab; label: string; href: string }[] = [
  { id: "feed", label: "Home", href: "/feed" },
  { id: "discover", label: "Discover", href: "/discover" },
  { id: "friends", label: "Friends", href: "/friends" },
  { id: "events", label: "My Events", href: "/events" },
  { id: "profile", label: "Profile", href: "/profile" },
];

function Icon({ id, active }: { id: Tab; active: boolean }) {
  const color = active ? "#F0EDE8" : "rgba(240,237,232,0.35)";
  const size = 22;
  switch (id) {
    case "feed":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>;
    case "discover":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>;
    case "friends":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>;
    case "events":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case "profile":
      return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>;
  }
}

export default function BottomNav({ active }: { active: Tab }) {
  return (
    <>
      {/* Mobile bottom nav */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "rgba(8,8,8,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
      }}
        className="desktop-hide"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link key={tab.id} href={tab.href} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              padding: "10px 0 6px",
              textDecoration: "none",
              color: isActive ? "#F0EDE8" : "rgba(240,237,232,0.35)",
            }}>
              <Icon id={tab.id} active={isActive} />
              <span style={{ fontSize: "0.6rem", marginTop: "3px", fontWeight: isActive ? 600 : 400 }}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Desktop sidebar */}
      <nav style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: "220px", zIndex: 50,
        background: "rgba(8,8,8,0.97)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column",
        padding: "24px 12px",
      }}
        className="mobile-hide"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px 24px" }}>
          <Image src="/logo.png" alt="ThisFriday" width={28} height={28} style={{ borderRadius: "7px" }} />
          <span style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.02em", color: "#F0EDE8" }}>ThisFriday</span>
        </div>
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link key={tab.id} href={tab.href} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "10px 12px", borderRadius: "10px",
              textDecoration: "none", marginBottom: "2px",
              background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
              color: isActive ? "#F0EDE8" : "rgba(240,237,232,0.45)",
              transition: "background 0.15s, color 0.15s",
            }}>
              <Icon id={tab.id} active={isActive} />
              <span style={{ fontWeight: isActive ? 600 : 400, fontSize: "0.9rem" }}>{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .desktop-hide { display: none !important; }
        }
        @media (max-width: 767px) {
          .mobile-hide { display: none !important; }
        }
      `}</style>
    </>
  );
}

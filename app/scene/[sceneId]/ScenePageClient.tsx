"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { createClient } from "@supabase/supabase-js";

const IOS_STORE = "https://apps.apple.com/ca/app/thisfriday/id6760683323";

const FLARE_LABELS: Record<string, string> = {
  house_party: "House Party", pregame: "Pregame", bar_crawl: "Bar Crawl",
  darty: "Darty", kickback: "Kickback", function: "Function",
  concert: "Concert", club_night: "Club Night", birthday: "Birthday", tailgate: "Tailgate",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

type Scene = {
  title: string;
  location: string;
  date: string;
  flare: string | null;
  photo_url: string | null;
  host_id: string;
};

type Environment = "ios-iab" | "ios" | "desktop";

export default function ScenePageClient({ sceneId }: { sceneId: string }) {
  const [env, setEnv] = useState<Environment | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [hostName, setHostName] = useState<string | null>(null);
  const [goingCount, setGoingCount] = useState<number | null>(null);
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
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    async function load() {
      const { data: sceneData } = await supabase
        .from("hosted_events")
        .select("title, location, date, flare, photo_url, host_id")
        .eq("id", sceneId).single();
      if (!sceneData) return;
      setScene(sceneData);
      const [{ data: hostData }, { count }] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("id", sceneData.host_id).single(),
        supabase.from("hosted_event_guests").select("*", { count: "exact", head: true })
          .eq("hosted_event_id", sceneId).eq("status", "accepted"),
      ]);
      setHostName(hostData?.display_name ?? null);
      setGoingCount(count ?? 0);
    }
    load();
  }, [sceneId]);

  useEffect(() => {
    if (env !== "ios") return;
    window.location.href = `thisfriday://scene/${sceneId}`;
  }, [env, sceneId]);

  useEffect(() => {
    if (env !== "desktop" || !scriptLoaded || !qrRef.current) return;
    qrRef.current.innerHTML = "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).QRCode(qrRef.current, {
      text: `https://thisfridayapp.com/scene/${sceneId}`,
      width: 160, height: 160,
      colorDark: "#F0EDE8", colorLight: "#080808",
    });
  }, [env, scriptLoaded, sceneId]);

  function openInApp() {
    window.location.href = `thisfriday://scene/${sceneId}`;
    setTimeout(() => { window.location.href = IOS_STORE; }, 500);
  }

  const S = {
    page: {
      background: "#080808", color: "#F0EDE8", minHeight: "100vh",
      display: "flex", flexDirection: "column" as const, alignItems: "center",
      fontFamily: "var(--font-inter)",
    },
    cover: { width: "100%", maxWidth: "480px", aspectRatio: "16/9", objectFit: "cover" as const },
    coverPlaceholder: {
      width: "100%", maxWidth: "480px", aspectRatio: "16/9",
      background: "rgba(240,237,232,0.05)", borderBottom: "1px solid rgba(240,237,232,0.08)",
    },
    body: {
      width: "100%", maxWidth: "480px", padding: "1.5rem",
      display: "flex", flexDirection: "column" as const, gap: "1.25rem",
    },
    wordmark: {
      fontWeight: 800, fontSize: "0.875rem", letterSpacing: "0.12em",
      textTransform: "uppercase" as const, color: "rgba(240,237,232,0.4)",
    },
    title: { fontWeight: 700, fontSize: "1.75rem", letterSpacing: "-0.02em", lineHeight: 1.15, color: "#F0EDE8", margin: 0 },
    metaRow: { fontSize: "0.9375rem", color: "rgba(240,237,232,0.55)" },
    divider: { height: "1px", background: "rgba(240,237,232,0.08)" },
    btn: {
      background: "#F0EDE8", color: "#080808", border: "none", borderRadius: "0.875rem",
      padding: "1rem", width: "100%", fontFamily: "var(--font-inter)", fontWeight: 700,
      fontSize: "1rem", cursor: "pointer",
    },
    storeBtn: {
      background: "transparent", color: "rgba(240,237,232,0.5)",
      border: "1px solid rgba(240,237,232,0.15)", borderRadius: "0.875rem",
      padding: "0.875rem", width: "100%", fontFamily: "var(--font-inter)",
      fontWeight: 500, fontSize: "0.9375rem", cursor: "pointer",
    },
  };

  return (
    <>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js" onLoad={() => setScriptLoaded(true)} />
      <main style={S.page}>
        {scene?.photo_url
          ? <img src={scene.photo_url} alt={scene.title} style={S.cover} />
          : <div style={S.coverPlaceholder} />}

        <div style={S.body}>
          <span style={S.wordmark}>ThisFriday</span>
          {scene && (
            <>
              {scene.flare && <span style={{ fontSize: "0.8125rem", color: "rgba(240,237,232,0.45)", fontWeight: 500 }}>{FLARE_LABELS[scene.flare] ?? scene.flare}</span>}
              <p style={S.title}>{scene.title}</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: "0.375rem" }}>
                <span style={S.metaRow}>{scene.location}</span>
                <span style={S.metaRow}>{formatDate(scene.date)}</span>
                {hostName && <span style={S.metaRow}>Hosted by {hostName}</span>}
                {goingCount !== null && goingCount > 0 && <span style={S.metaRow}>{goingCount} going</span>}
              </div>
            </>
          )}
          <div style={S.divider} />

          {env === "ios-iab" ? (
            <>
              <p style={{ fontWeight: 700, fontSize: "1.25rem", color: "#F0EDE8", margin: 0 }}>Open in Safari to join</p>
              <p style={{ ...S.metaRow, margin: 0 }}>
                Tap <strong style={{ color: "#F0EDE8" }}>···</strong> then <strong style={{ color: "#F0EDE8" }}>Open in Browser</strong>
              </p>
            </>
          ) : env === "desktop" ? (
            <>
              <p style={{ ...S.metaRow, textAlign: "center" }}>Scan to open on your phone</p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div ref={qrRef} style={{ padding: "1.25rem", background: "#080808", borderRadius: "1rem", border: "1px solid rgba(240,237,232,0.1)", minWidth: "160px", minHeight: "160px" }} />
              </div>
            </>
          ) : (
            <>
              <button style={S.btn} onClick={openInApp}>Open in ThisFriday</button>
              <button style={S.storeBtn} onClick={() => { window.location.href = IOS_STORE; }}>Download ThisFriday</button>
            </>
          )}
        </div>
      </main>
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";

interface HostedEvent {
  id: string;
  host_id: string;
  title: string;
  location: string;
  date: string;
  flare: string | null;
  photo_url: string | null;
  description: string | null;
  visibility: string | null;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const FLARE_COLORS: Record<string, string> = {
  house_party: "#6b5020", pregame: "#4a6b20", bar_crawl: "#20506b",
  darty: "#c4a030", kickback: "#6b4060", function: "#8050c0",
  concert: "#c04050", club_night: "#5030a0", birthday: "#c45a8a", tailgate: "#6b4020",
};
const FLARE_LABELS: Record<string, string> = {
  house_party: "House Party", pregame: "Pregame", bar_crawl: "Bar Crawl",
  darty: "Darty", kickback: "Kickback", function: "Function",
  concert: "Concert", club_night: "Club Night", birthday: "Birthday", tailgate: "Tailgate",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function DiscoverPage() {
  const router = useRouter();
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [hostMap, setHostMap] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFlare, setSelectedFlare] = useState<string | null>(null);

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data } = await supabase
      .from("hosted_events").select("*")
      .in("visibility", ["semi_public", "public"])
      .order("date", { ascending: true });

    const evts = data || [];
    setEvents(evts);

    const hostIds = [...new Set(evts.map((e: HostedEvent) => e.host_id))];
    if (hostIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id,display_name,avatar_url").in("id", hostIds);
      setHostMap(Object.fromEntries((profiles || []).map((p: Profile) => [p.id, p])));
    }
    setLoading(false);
  }

  const flares = [...new Set(events.map((e) => e.flare).filter(Boolean))] as string[];

  const filtered = events.filter((e) => {
    const matchSearch = !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase());
    const matchFlare = !selectedFlare || e.flare === selectedFlare;
    return matchSearch && matchFlare;
  });

  return (
    <PageShell><div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Discover
        </h1>
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px",
            padding: "10px 14px", color: "#F0EDE8", fontSize: "0.9rem",
            outline: "none", boxSizing: "border-box", marginBottom: "10px",
          }}
        />
        {/* Flare filters */}
        {flares.length > 0 && (
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
            <button
              onClick={() => setSelectedFlare(null)}
              style={{
                background: !selectedFlare ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "20px", padding: "5px 12px",
                color: "#F0EDE8", fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              All
            </button>
            {flares.map((f) => {
              const color = FLARE_COLORS[f] || "#555";
              return (
                <button
                  key={f}
                  onClick={() => setSelectedFlare(selectedFlare === f ? null : f)}
                  style={{
                    background: selectedFlare === f ? color + "44" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${selectedFlare === f ? color : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "20px", padding: "5px 12px",
                    color: selectedFlare === f ? color : "rgba(240,237,232,0.6)",
                    fontSize: "0.75rem", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600,
                  }}
                >
                  {FLARE_LABELS[f] || f}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ padding: "12px 16px", paddingBottom: "80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
            <p>No public events found</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "12px",
          }}>
            {filtered.map((event) => {
              const host = hostMap[event.host_id];
              const flareColor = event.flare ? (FLARE_COLORS[event.flare] || "#555") : "#555";
              const flareLabel = event.flare ? (FLARE_LABELS[event.flare] || event.flare) : null;
              return (
                <div key={event.id} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "14px", overflow: "hidden",
                }}>
                  {event.photo_url && (
                    <img src={event.photo_url} alt="" style={{ width: "100%", height: "140px", objectFit: "cover" }} />
                  )}
                  <div style={{ padding: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0,
                      }}>
                        {host?.avatar_url && <img src={host.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "rgba(240,237,232,0.5)" }}>
                        {host?.display_name || "Someone"}
                      </span>
                      {flareLabel && (
                        <span style={{
                          marginLeft: "auto", background: flareColor + "33", color: flareColor,
                          border: `1px solid ${flareColor}55`, borderRadius: "20px",
                          padding: "2px 7px", fontSize: "0.65rem", fontWeight: 600,
                        }}>
                          {flareLabel}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: "0 0 4px" }}>{event.title}</h3>
                    <p style={{ color: "rgba(240,237,232,0.45)", fontSize: "0.78rem", margin: 0 }}>
                      {event.location} · {formatDate(event.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav active="discover" />
    </div></PageShell>
  );
}

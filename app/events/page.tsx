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
  created_at: string;
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

function isPast(dateStr: string) {
  return new Date(dateStr) < new Date();
}

export default function EventsPage() {
  const router = useRouter();
  const [hosted, setHosted] = useState<HostedEvent[]>([]);
  const [going, setGoing] = useState<HostedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => { loadEvents(); }, []);

  async function loadEvents() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const userId = user.id.toLowerCase();
    setCurrentUserId(userId);

    const { data: hostedEvents } = await supabase
      .from("hosted_events").select("*").eq("host_id", userId)
      .order("date", { ascending: false });

    const { data: guestRows } = await supabase
      .from("hosted_event_guests").select("hosted_event_id")
      .eq("user_id", userId).eq("status", "accepted");

    const guestIds = (guestRows || []).map((r: { hosted_event_id: string }) => r.hosted_event_id);
    const hostedIds = new Set((hostedEvents || []).map((e: HostedEvent) => e.id));

    let goingEvents: HostedEvent[] = [];
    if (guestIds.length > 0) {
      const { data } = await supabase
        .from("hosted_events").select("*")
        .in("id", guestIds.filter((id: string) => !hostedIds.has(id)))
        .order("date", { ascending: false });
      goingEvents = data || [];
    }

    setHosted(hostedEvents || []);
    setGoing(goingEvents);
    setLoading(false);
  }

  async function deleteEvent(eventId: string) {
    if (!confirm("Delete this event?")) return;
    const supabase = createClient();
    await supabase.from("hosted_events").delete().eq("id", eventId);
    setHosted((prev) => prev.filter((e) => e.id !== eventId));
  }

  const allEvents = [...hosted, ...going];
  const upcoming = allEvents.filter((e) => !isPast(e.date));
  const past = allEvents.filter((e) => isPast(e.date));
  const displayed = tab === "upcoming" ? upcoming : past;

  return (
    <PageShell><div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        padding: "16px 16px 0",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          My Events
        </h1>
        <div style={{ display: "flex", gap: "0" }}>
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "10px", background: "none", border: "none",
                color: tab === t ? "#F0EDE8" : "rgba(240,237,232,0.35)",
                fontWeight: tab === t ? 700 : 400,
                fontSize: "0.9rem", cursor: "pointer",
                borderBottom: tab === t ? "2px solid #F0EDE8" : "2px solid transparent",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "12px 16px", paddingBottom: "80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
            <p style={{ fontSize: "1rem" }}>No {tab} events</p>
          </div>
        ) : (
          displayed.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              isOwn={event.host_id === currentUserId}
              onDelete={() => deleteEvent(event.id)}
            />
          ))
        )}
      </div>

      <BottomNav active="events" />
    </div></PageShell>
  );
}

function EventRow({ event, isOwn, onDelete }: {
  event: HostedEvent;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const flareColor = event.flare ? (FLARE_COLORS[event.flare] || "#555") : "#555";
  const flareLabel = event.flare ? (FLARE_LABELS[event.flare] || event.flare) : null;
  const past = isPast(event.date);

  return (
    <div style={{
      display: "flex", gap: "12px",
      padding: "14px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      opacity: past ? 0.6 : 1,
    }}>
      {event.photo_url ? (
        <img
          src={event.photo_url}
          alt=""
          style={{ width: 60, height: 60, borderRadius: "10px", objectFit: "cover", flexShrink: 0 }}
        />
      ) : (
        <div style={{
          width: 60, height: 60, borderRadius: "10px", flexShrink: 0,
          background: flareColor + "33",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem",
        }}>
          🎉
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
          <h3 style={{ fontWeight: 700, fontSize: "0.95rem", margin: 0, lineHeight: 1.3 }}>
            {event.title}
          </h3>
          {isOwn && (
            <button
              onClick={onDelete}
              style={{
                background: "none", border: "none",
                color: "rgba(240,237,232,0.3)", cursor: "pointer",
                fontSize: "0.75rem", flexShrink: 0, padding: "0",
              }}
            >
              ✕
            </button>
          )}
        </div>
        <p style={{ color: "rgba(240,237,232,0.5)", fontSize: "0.78rem", margin: "3px 0" }}>
          {event.location}
        </p>
        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.75rem", margin: 0 }}>
          {formatDate(event.date)}
        </p>
        <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
          {isOwn && (
            <span style={{
              background: "rgba(255,255,255,0.08)", borderRadius: "20px",
              padding: "2px 8px", fontSize: "0.65rem", color: "rgba(240,237,232,0.5)",
            }}>
              Host
            </span>
          )}
          {flareLabel && (
            <span style={{
              background: flareColor + "33", color: flareColor,
              border: `1px solid ${flareColor}55`,
              borderRadius: "20px", padding: "2px 8px", fontSize: "0.65rem", fontWeight: 600,
            }}>
              {flareLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

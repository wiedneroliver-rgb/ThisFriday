"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import PageShell from "@/components/PageShell";
import BottomNav from "@/components/BottomNav";
import GuestListSignup from "@/components/GuestListSignup";
import ShareButton from "@/components/ShareButton";
import ReportModal from "@/components/ReportModal";

interface Event {
  id: number;
  title: string;
  venue: string;
  date: string;
  start_time: string | null;
  description: string | null;
  poster_url: string | null;
  city: string | null;
  guest_list_enabled: boolean | null;
  is_featured: boolean | null;
  eventbrite_id: string | null;
  guest_list_cap?: number | null;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = Number(params.id);
  const { userId, profile: myProfile } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [isGoing, setIsGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const [friendsGoing, setFriendsGoing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [goingLoading, setGoingLoading] = useState(false);
  const [showGuestList, setShowGuestList] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (eventId && userId) load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, userId]);

  async function load() {
    const supabase = createClient();

    const { data: evtData } = await supabase
      .from("events").select("*").eq("id", eventId).single();
    if (!evtData) { router.push("/discover"); return; }
    setEvent(evtData);

    // Going count
    const { data: goingCounts } = await supabase
      .rpc("get_event_going_counts") as { data: { event_id: number; going_count: number }[] | null };
    const myCount = (goingCounts || []).find((r) => r.event_id === eventId)?.going_count || 0;
    setGoingCount(myCount);

    // My going status
    const { data: myGoingRow } = await supabase
      .from("going").select("user_id").eq("user_id", userId).eq("event_id", eventId).maybeSingle();
    setIsGoing(!!myGoingRow);

    // Friends going
    const { data: friendRows } = await supabase
      .from("friends").select("friend_id").eq("user_id", userId);
    const friendIds = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);
    if (friendIds.length > 0) {
      const { data: friendGoingRows } = await supabase
        .from("going").select("user_id").in("user_id", friendIds).eq("event_id", eventId);
      const goingIds = (friendGoingRows || []).map((r: { user_id: string }) => r.user_id);
      if (goingIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles").select("id,display_name,avatar_url").in("id", goingIds);
        setFriendsGoing(profs || []);
      }
    }

    setLoading(false);
  }

  async function toggleGoing() {
    if (!userId || goingLoading) return;
    setGoingLoading(true);
    const supabase = createClient();
    if (isGoing) {
      await supabase.from("going").delete().eq("user_id", userId).eq("event_id", eventId);
      setIsGoing(false);
      setGoingCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("going").insert({ user_id: userId, event_id: eventId });
      setIsGoing(true);
      setGoingCount((c) => c + 1);
    }
    setGoingLoading(false);
  }

  function formatEventDate(dateStr: string, startTime?: string | null) {
    const d = new Date(dateStr);
    const dayStr = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
    if (startTime) return `${dayStr} · ${startTime}`;
    return dayStr;
  }

  if (loading || !event) {
    return (
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
        Loading...
      </div>
    );
  }

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Hero */}
        <div style={{ position: "relative" }}>
          {event.poster_url ? (
            <>
              <img src={event.poster_url} alt={event.title} style={{ width: "100%", aspectRatio: "4/3", maxHeight: 380, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 40%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.98) 100%)" }} />
            </>
          ) : (
            <div style={{ height: 180, background: "rgba(255,255,255,0.03)" }} />
          )}

          <button
            onClick={() => router.back()}
            style={{
              position: "absolute", top: "52px", left: "16px",
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "1rem",
            }}
          >
            ‹
          </button>

          {/* Three-dot menu */}
          <button
            onClick={() => setShowReport(true)}
            style={{
              position: "absolute", top: "52px", right: "16px",
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
            }}
          >
            ⋯
          </button>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 20px" }}>
            <h1 style={{ fontWeight: 900, fontSize: "clamp(1.5rem, 5vw, 2rem)", letterSpacing: "-0.03em", margin: "0 0 6px", color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.8)", lineHeight: 1.1 }}>
              {event.title}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.85rem", margin: 0 }}>
              📍 {event.venue}
            </p>
          </div>
        </div>

        <div style={{ padding: "20px 20px 120px" }}>
          {/* Date/time + going info */}
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "14px", padding: "14px 16px", marginBottom: "16px",
          }}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
              <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🗓</span>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(240,237,232,0.7)" }}>
                {formatEventDate(event.date, event.start_time)}
              </p>
            </div>
            {goingCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1rem" }}>👥</span>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(240,237,232,0.55)" }}>
                  {goingCount} people going
                </p>
              </div>
            )}
          </div>

          {/* Friends going */}
          {friendsGoing.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>
                Friends Going
              </p>
              <div style={{ display: "flex", gap: "14px", overflowX: "auto", paddingBottom: "4px" }}>
                {friendsGoing.map((f) => (
                  <div key={f.id} style={{ flexShrink: 0, textAlign: "center" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: "4px" }}>
                      {f.avatar_url && <img src={f.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(240,237,232,0.45)", maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.display_name?.split(" ")[0] || "?"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div style={{ marginBottom: "20px" }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 8px" }}>About</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(240,237,232,0.7)", lineHeight: 1.55 }}>{event.description}</p>
            </div>
          )}

          {/* Guest list signup */}
          {event.guest_list_enabled && (
            <button
              onClick={() => setShowGuestList(true)}
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "12px", padding: "13px",
                color: "#F0EDE8", fontWeight: 600, fontSize: "0.9rem",
                cursor: "pointer", marginBottom: "12px",
              }}
            >
              📋 Join Guest List
            </button>
          )}

          {/* Make a plan from this event */}
          <button
            onClick={() => router.push(`/create?venueId=&venueName=${encodeURIComponent(event.venue)}`)}
            style={{
              width: "100%", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "12px", padding: "13px",
              color: "rgba(240,237,232,0.6)", fontWeight: 600, fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            + Make a Plan for This Event
          </button>
        </div>

        {/* Fixed bottom bar */}
        <div className="event-bottom-bar" style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: "rgba(8,8,8,0.97)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(16px)",
          padding: "10px 16px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom, 8px))",
          zIndex: 55,
          display: "flex", gap: "10px",
        }}>
          <style>{`@media (min-width: 768px) { .event-bottom-bar { left: 220px !important; } }`}</style>
          <ShareButton
            url={`https://thisfridayapp.com/event/${event.id}`}
            title={event.title}
          />
          <button
            onClick={toggleGoing}
            disabled={goingLoading}
            style={{
              flex: 1, background: isGoing ? "rgba(255,255,255,0.1)" : "#F0EDE8",
              color: isGoing ? "#F0EDE8" : "#080808",
              border: isGoing ? "1px solid rgba(255,255,255,0.15)" : "none",
              borderRadius: "22px", padding: "13px",
              fontWeight: 700, fontSize: "0.9rem",
              cursor: goingLoading ? "not-allowed" : "pointer",
              opacity: goingLoading ? 0.6 : 1,
            }}
          >
            {isGoing ? "Going ✓" : "I'm Going"}
          </button>
        </div>

        {/* Guest list modal */}
        {showGuestList && (
          <GuestListSignup
            eventId={eventId}
            currentUserId={userId}
            displayName={myProfile?.display_name || ""}
            cap={event.guest_list_cap}
            onClose={() => setShowGuestList(false)}
          />
        )}

        {/* Report modal */}
        {showReport && (
          <ReportModal
            type="event"
            targetId={String(eventId)}
            reporterId={userId}
            onClose={() => setShowReport(false)}
          />
        )}

        <BottomNav active="discover" />
      </div>
    </PageShell>
  );
}

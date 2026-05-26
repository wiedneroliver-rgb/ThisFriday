"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

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

interface FeedItem {
  event: HostedEvent;
  host: Profile | null;
  goingCount: number;
  isJoined: boolean;
}

const FLARE_COLORS: Record<string, string> = {
  house_party: "#6b5020",
  pregame: "#4a6b20",
  bar_crawl: "#20506b",
  darty: "#c4a030",
  kickback: "#6b4060",
  function: "#8050c0",
  concert: "#c04050",
  club_night: "#5030a0",
  birthday: "#c45a8a",
  tailgate: "#6b4020",
};

const FLARE_LABELS: Record<string, string> = {
  house_party: "House Party",
  pregame: "Pregame",
  bar_crawl: "Bar Crawl",
  darty: "Darty",
  kickback: "Kickback",
  function: "Function",
  concert: "Concert",
  club_night: "Club Night",
  birthday: "Birthday",
  tailgate: "Tailgate",
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatEventTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function FeedPage() {
  const router = useRouter();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    loadFeed();
  }, []);

  async function loadFeed() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const userId = user.id.toLowerCase();
    setCurrentUserId(userId);

    // Get friends
    const { data: friendRows } = await supabase
      .from("friends").select("friend_id").eq("user_id", userId);
    const friendIds = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);
    const allIds = [...friendIds, userId];

    // Get events from friends + discoverable
    const { data: friendEvents } = await supabase
      .from("hosted_events").select("*")
      .in("host_id", allIds)
      .order("created_at", { ascending: false });

    const { data: publicEvents } = await supabase
      .from("hosted_events").select("*")
      .in("visibility", ["semi_public", "public"])
      .order("created_at", { ascending: false });

    const knownIds = new Set((friendEvents || []).map((e: HostedEvent) => e.id));
    const extra = (publicEvents || []).filter((e: HostedEvent) => !knownIds.has(e.id));
    const allEvents: HostedEvent[] = [...(friendEvents || []), ...extra];

    if (allEvents.length === 0) { setLoading(false); return; }

    // Get host profiles
    const hostIds = [...new Set(allEvents.map((e) => e.host_id))];
    const { data: profiles } = await supabase
      .from("profiles").select("id,display_name,avatar_url").in("id", hostIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: Profile) => [p.id, p]));

    // Get guest counts
    const eventIds = allEvents.map((e) => e.id);
    const { data: guests } = await supabase
      .from("hosted_event_guests").select("hosted_event_id,user_id,status")
      .in("hosted_event_id", eventIds);

    const countMap: Record<string, number> = {};
    const joinedSet = new Set<string>();
    for (const g of guests || []) {
      if (g.status !== "collaborator") countMap[g.hosted_event_id] = (countMap[g.hosted_event_id] || 0) + 1;
      if (g.user_id === userId && g.status === "accepted") joinedSet.add(g.hosted_event_id);
    }

    const feedItems: FeedItem[] = allEvents.map((event) => ({
      event,
      host: profileMap[event.host_id] || null,
      goingCount: countMap[event.id] || 0,
      isJoined: joinedSet.has(event.id),
    }));

    setItems(feedItems);
    setLoading(false);
  }

  async function toggleJoin(item: FeedItem) {
    if (joiningId) return;
    setJoiningId(item.event.id);
    const supabase = createClient();

    if (item.isJoined) {
      await supabase.from("hosted_event_guests")
        .delete()
        .eq("hosted_event_id", item.event.id)
        .eq("user_id", currentUserId);
      setItems((prev) => prev.map((i) =>
        i.event.id === item.event.id
          ? { ...i, isJoined: false, goingCount: Math.max(0, i.goingCount - 1) }
          : i
      ));
    } else {
      await supabase.rpc("join_scene", { p_event_id: item.event.id, p_user_id: currentUserId });
      setItems((prev) => prev.map((i) =>
        i.event.id === item.event.id
          ? { ...i, isJoined: true, goingCount: i.goingCount + 1 }
          : i
      ));
    }
    setJoiningId(null);
  }

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
          padding: "16px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image src="/logo.png" alt="" width={30} height={30} style={{ borderRadius: "8px" }} />
            <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: 0 }}>ThisFriday</h1>
          </div>
        </div>

        {/* Feed */}
        <div style={{ padding: "12px 0", paddingBottom: "80px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
              Loading...
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 16px", color: "rgba(240,237,232,0.3)" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>No plans yet</p>
              <p style={{ fontSize: "0.85rem" }}>Add friends to see their plans here</p>
            </div>
          ) : (
            items.map((item) => (
              <FeedCard
                key={item.event.id}
                item={item}
                currentUserId={currentUserId}
                onJoin={() => toggleJoin(item)}
                joining={joiningId === item.event.id}
                onTap={() => router.push(`/events/${item.event.id}`)}
              />
            ))
          )}
        </div>

        <BottomNav active="feed" />
      </div>
    </PageShell>
  );
}

function FeedCard({ item, currentUserId, onJoin, joining, onTap }: {
  item: FeedItem;
  currentUserId: string;
  onJoin: () => void;
  joining: boolean;
  onTap: () => void;
}) {
  const { event, host, goingCount, isJoined } = item;
  const isOwn = event.host_id === currentUserId;
  const flareColor = event.flare ? (FLARE_COLORS[event.flare] || "#555") : "#555";
  const flareLabel = event.flare ? (FLARE_LABELS[event.flare] || event.flare) : null;
  const hasPhoto = !!event.photo_url;

  return (
    <div
      onClick={onTap}
      style={{
        margin: "0 12px 14px",
        borderRadius: "18px",
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.07)",
        cursor: "pointer",
        position: "relative",
        background: hasPhoto ? "transparent" : "rgba(255,255,255,0.04)",
      }}
    >
      {hasPhoto ? (
        /* Photo card: full image with gradient overlay + all details on top */
        <div style={{ position: "relative" }}>
          <img
            src={event.photo_url!}
            alt={event.title}
            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
          />
          {/* Dark gradient from bottom */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.0) 35%, rgba(0,0,0,0.6) 65%, rgba(0,0,0,0.92) 100%)",
          }} />

          {/* Top row: host + time + flare */}
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0,
            display: "flex", alignItems: "center", gap: "8px",
            padding: "12px 14px",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              overflow: "hidden", flexShrink: 0,
              border: "1.5px solid rgba(255,255,255,0.25)",
            }}>
              {host?.avatar_url && (
                <img src={host.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <span style={{ fontWeight: 600, fontSize: "0.8rem", color: "#fff", flex: 1, textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              {host?.display_name || "Someone"}
            </span>
            <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              {timeAgo(event.created_at)}
            </span>
            {flareLabel && (
              <span style={{
                background: flareColor + "55",
                color: "#fff",
                border: `1px solid ${flareColor}88`,
                borderRadius: "20px",
                padding: "2px 8px",
                fontSize: "0.65rem",
                fontWeight: 700,
                backdropFilter: "blur(4px)",
              }}>
                {flareLabel}
              </span>
            )}
          </div>

          {/* Bottom overlay: title + location + date + actions */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: "12px 14px 14px",
          }}>
            <h3 style={{
              fontWeight: 800, fontSize: "1.35rem", margin: "0 0 4px",
              color: "#fff", letterSpacing: "-0.02em",
              textShadow: "0 2px 8px rgba(0,0,0,0.7)",
              lineHeight: 1.15,
            }}>
              {event.title}
            </h3>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.78rem", margin: "0 0 10px", textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
              📍 {event.location} · {formatEventTime(event.date)}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.78rem" }}>
                {goingCount > 0 ? `${goingCount} going` : "Be the first"}
              </span>
              {!isOwn && (
                <button
                  onClick={(e) => { e.stopPropagation(); onJoin(); }}
                  disabled={joining}
                  style={{
                    background: isJoined ? "rgba(255,255,255,0.15)" : "#F0EDE8",
                    color: isJoined ? "#F0EDE8" : "#080808",
                    border: isJoined ? "1px solid rgba(255,255,255,0.25)" : "none",
                    borderRadius: "20px",
                    padding: "6px 16px",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    cursor: joining ? "not-allowed" : "pointer",
                    opacity: joining ? 0.6 : 1,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {isJoined ? "Going ✓" : "I'm going"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Text-only card: no photo */
        <div style={{ padding: "14px" }}>
          {/* Host row */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden", flexShrink: 0,
            }}>
              {host?.avatar_url && (
                <img src={host.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                {host?.display_name || "Someone"}
              </span>
              <span style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.8rem" }}>
                {" "}· {timeAgo(event.created_at)}
              </span>
            </div>
            {flareLabel && (
              <span style={{
                background: flareColor + "33",
                color: flareColor,
                border: `1px solid ${flareColor}66`,
                borderRadius: "20px",
                padding: "3px 8px",
                fontSize: "0.7rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}>
                {flareLabel}
              </span>
            )}
          </div>
          <h3 style={{ fontWeight: 800, fontSize: "1.4rem", margin: "0 0 4px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            {event.title}
          </h3>
          <p style={{ color: "rgba(240,237,232,0.5)", fontSize: "0.82rem", margin: "0 0 12px" }}>
            {event.location} · {formatEventTime(event.date)}
          </p>
          {event.description && (
            <p style={{ color: "rgba(240,237,232,0.7)", fontSize: "0.85rem", margin: "0 0 12px", lineHeight: 1.4 }}>
              {event.description}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.8rem" }}>
              {goingCount > 0 ? `${goingCount} going` : "Be the first"}
            </span>
            {!isOwn && (
              <button
                onClick={(e) => { e.stopPropagation(); onJoin(); }}
                disabled={joining}
                style={{
                  background: isJoined ? "rgba(255,255,255,0.08)" : "#F0EDE8",
                  color: isJoined ? "#F0EDE8" : "#080808",
                  border: isJoined ? "1px solid rgba(255,255,255,0.15)" : "none",
                  borderRadius: "20px",
                  padding: "7px 16px",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  cursor: joining ? "not-allowed" : "pointer",
                  opacity: joining ? 0.6 : 1,
                }}
              >
                {isJoined ? "Going ✓" : "I'm going"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

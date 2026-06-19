"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import PageShell from "@/components/PageShell";
import BottomNav from "@/components/BottomNav";
import BlockReportMenu from "@/components/BlockReportMenu";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio?: string | null;
}

interface HostedEvent {
  id: string;
  title: string;
  date: string;
  photo_url: string | null;
  flare: string | null;
  location: string;
  visibility: string | null;
}

type RelationState = "none" | "pending_sent" | "pending_received" | "friends";

const FLARE_COLORS: Record<string, string> = {
  house_party: "#c8841a", pregame: "#4a6b20", bar_crawl: "#20506b",
  darty: "#c4a030", kickback: "#6b4060", function: "#8050c0",
  concert: "#c04050", club_night: "#5030a0", birthday: "#c45a8a", tailgate: "#6b4020",
};

export default function UserProfilePage() {
  const router = useRouter();
  const params = useParams();
  const targetId = params.userId as string;
  const { userId: currentUserId } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<HostedEvent[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [relation, setRelation] = useState<RelationState>("none");
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (currentUserId && targetId) {
      // Redirect to own profile page if viewing self
      if (currentUserId === targetId) {
        router.replace("/profile");
        return;
      }
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, targetId]);

  async function load() {
    const supabase = createClient();

    const { data: prof } = await supabase
      .from("profiles").select("id,display_name,avatar_url,username,bio")
      .eq("id", targetId).single();
    if (!prof) { router.push("/feed"); return; }
    setProfile(prof);

    // Check if blocked
    const { data: blockRow } = await supabase
      .from("blocked_users").select("user_id")
      .eq("user_id", currentUserId).eq("blocked_id", targetId).maybeSingle();
    setIsBlocked(!!blockRow);

    // Friend count
    const { count: fc } = await supabase
      .from("friends").select("*", { count: "exact", head: true }).eq("user_id", targetId);
    setFriendCount(fc || 0);

    // Event count
    const { count: ec } = await supabase
      .from("hosted_events").select("*", { count: "exact", head: true }).eq("host_id", targetId);
    setEventCount(ec || 0);

    // Relation state
    const { data: friendRow } = await supabase
      .from("friends").select("user_id")
      .eq("user_id", currentUserId).eq("friend_id", targetId).maybeSingle();
    if (friendRow) {
      setRelation("friends");
    } else {
      // Check pending sent
      const { data: sentNotif } = await supabase
        .from("notifications").select("id")
        .eq("actor_id", currentUserId).eq("user_id", targetId).eq("type", "friend_request").maybeSingle();
      if (sentNotif) {
        setRelation("pending_sent");
      } else {
        // Check pending received
        const { data: recvNotif } = await supabase
          .from("notifications").select("id")
          .eq("actor_id", targetId).eq("user_id", currentUserId).eq("type", "friend_request").maybeSingle();
        setRelation(recvNotif ? "pending_received" : "none");
      }
    }

    // Public upcoming events
    const now = new Date().toISOString();
    const { data: evts } = await supabase
      .from("hosted_events").select("id,title,date,photo_url,flare,location,visibility")
      .eq("host_id", targetId)
      .in("visibility", ["public", "semi_public"])
      .gte("date", now)
      .order("date", { ascending: true })
      .limit(10);
    setEvents(evts || []);

    setLoading(false);
  }

  async function handleAddFriend() {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("notifications").insert({
      user_id: targetId,
      actor_id: currentUserId,
      type: "friend_request",
      message: null,
      read: false,
    });
    setRelation("pending_sent");
    setActionLoading(false);
  }

  async function handleCancelRequest() {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("notifications")
      .delete()
      .eq("actor_id", currentUserId).eq("user_id", targetId).eq("type", "friend_request");
    setRelation("none");
    setActionLoading(false);
  }

  async function handleAccept() {
    setActionLoading(true);
    const supabase = createClient();
    await supabase.rpc("accept_friend_request", {
      p_requester_id: targetId,
      p_accepter_id: currentUserId,
    });
    setRelation("friends");
    setFriendCount((c) => c + 1);
    setActionLoading(false);
  }

  async function handleUnfriend() {
    if (!confirm("Remove this friend?")) return;
    setActionLoading(true);
    const supabase = createClient();
    await supabase.from("friends").delete()
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${currentUserId})`);
    setRelation("none");
    setFriendCount((c) => Math.max(0, c - 1));
    setActionLoading(false);
  }

  async function handleBlock() {
    const supabase = createClient();
    await supabase.from("blocked_users").insert({ user_id: currentUserId, blocked_id: targetId });
    setIsBlocked(true);
    router.back();
  }

  async function handleUnblock() {
    const supabase = createClient();
    await supabase.from("blocked_users").delete()
      .eq("user_id", currentUserId).eq("blocked_id", targetId);
    setIsBlocked(false);
  }

  if (loading || !profile) {
    return (
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
        Loading...
      </div>
    );
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
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0EDE8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1rem", flexShrink: 0,
            }}
          >
            ‹
          </button>
          <h1 style={{ fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.02em", margin: 0, flex: 1 }}>
            {profile.display_name || "Profile"}
          </h1>
          <BlockReportMenu
            targetId={targetId}
            currentUserId={currentUserId}
            isBlocked={isBlocked}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
            reportType="user"
          />
        </div>

        <div style={{ padding: "24px 16px", paddingBottom: "80px", maxWidth: "480px", margin: "0 auto" }}>
          {/* Avatar + name */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0,
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.8rem" }}>
                  {(profile.display_name || "?")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ fontWeight: 800, fontSize: "1.2rem", margin: "0 0 2px" }}>
                {profile.display_name || "Unknown"}
              </h2>
              {profile.username && (
                <p style={{ color: "rgba(240,237,232,0.45)", fontSize: "0.85rem", margin: 0 }}>
                  @{profile.username}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p style={{ color: "rgba(240,237,232,0.65)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "20px" }}>
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{
            display: "flex", gap: "1px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: "14px", overflow: "hidden",
            marginBottom: "20px",
          }}>
            {[{ label: "Friends", value: friendCount }, { label: "Events", value: eventCount }].map((s) => (
              <div key={s.label} style={{
                flex: 1, textAlign: "center", padding: "14px 8px",
                background: "rgba(255,255,255,0.03)",
              }}>
                <p style={{ fontWeight: 800, fontSize: "1.4rem", margin: 0 }}>{s.value}</p>
                <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.72rem", margin: "2px 0 0" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Relation button */}
          {!isBlocked && (
            <div style={{ marginBottom: "24px" }}>
              {relation === "friends" ? (
                <button
                  onClick={handleUnfriend}
                  disabled={actionLoading}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px", padding: "13px",
                    color: "#F0EDE8", fontWeight: 600, fontSize: "0.9rem",
                    cursor: "pointer", opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Friends ✓
                </button>
              ) : relation === "pending_sent" ? (
                <button
                  onClick={handleCancelRequest}
                  disabled={actionLoading}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px", padding: "13px",
                    color: "rgba(240,237,232,0.5)", fontWeight: 600, fontSize: "0.9rem",
                    cursor: "pointer", opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Request Sent — Cancel
                </button>
              ) : relation === "pending_received" ? (
                <button
                  onClick={handleAccept}
                  disabled={actionLoading}
                  style={{
                    width: "100%", background: "#F0EDE8",
                    border: "none", borderRadius: "12px", padding: "13px",
                    color: "#080808", fontWeight: 800, fontSize: "0.9rem",
                    cursor: "pointer", opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Accept Friend Request
                </button>
              ) : (
                <button
                  onClick={handleAddFriend}
                  disabled={actionLoading}
                  style={{
                    width: "100%", background: "#F0EDE8",
                    border: "none", borderRadius: "12px", padding: "13px",
                    color: "#080808", fontWeight: 800, fontSize: "0.9rem",
                    cursor: "pointer", opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  Add Friend
                </button>
              )}
            </div>
          )}

          {isBlocked && (
            <div style={{ marginBottom: "24px" }}>
              <button
                onClick={handleUnblock}
                style={{
                  width: "100%", background: "rgba(255,80,80,0.1)",
                  border: "1px solid rgba(255,80,80,0.2)",
                  borderRadius: "12px", padding: "13px",
                  color: "#ff6b6b", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer",
                }}
              >
                Unblock User
              </button>
            </div>
          )}

          {/* Upcoming events */}
          {events.length > 0 && (
            <div>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>
                Upcoming Plans
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {events.map((evt) => {
                  const flareColor = evt.flare ? (FLARE_COLORS[evt.flare] || "#555") : "#555";
                  return (
                    <div
                      key={evt.id}
                      onClick={() => router.push(`/events/${evt.id}`)}
                      style={{
                        display: "flex", gap: "12px", alignItems: "center",
                        padding: "12px", borderRadius: "12px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        cursor: "pointer",
                      }}
                    >
                      {evt.photo_url ? (
                        <img src={evt.photo_url} alt="" style={{ width: 50, height: 50, borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 50, height: 50, borderRadius: "8px", background: flareColor + "33", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>🎉</div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 2px" }}>{evt.title}</p>
                        <p style={{ color: "rgba(240,237,232,0.45)", fontSize: "0.75rem", margin: 0 }}>
                          {evt.location} · {new Date(evt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <BottomNav active="friends" />
      </div>
    </PageShell>
  );
}

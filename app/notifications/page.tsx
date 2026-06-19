"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import PageShell from "@/components/PageShell";
import BottomNav from "@/components/BottomNav";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface AppNotification {
  id: number;
  user_id: string;
  type: string;
  actor_id: string | null;
  scene_id: string | null;
  message: string | null;
  read: boolean;
  created_at: string | null;
  profiles: Profile | null;
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return `${Math.max(1, Math.floor(diff))}m ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACTIONABLE_TYPES = ["friend_request", "scene_invite", "plan_invite", "added_as_favourite", "scene_join_request"];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    setCurrentUserId(user.id.toLowerCase());

    const { data } = await supabase
      .from("notifications")
      .select("*, profiles!actor_id(id, display_name, avatar_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setNotifications(data || []);
    setLoading(false);

    // Mark all as read
    supabase.from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(() => {});
  }

  async function dismiss(id: number) {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  async function clearAll() {
    const supabase = createClient();
    await supabase.from("notifications").delete().eq("user_id", currentUserId);
    setNotifications([]);
  }

  async function acceptFriendRequest(notif: AppNotification) {
    if (!notif.actor_id) return;
    const supabase = createClient();
    await supabase.rpc("accept_friend_request", {
      p_requester_id: notif.actor_id,
      p_accepter_id: currentUserId,
    });
    await supabase.from("notifications").delete().eq("id", notif.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
  }

  async function acceptSceneInvite(notif: AppNotification) {
    if (!notif.scene_id) return;
    const supabase = createClient();
    await supabase.from("hosted_event_guests")
      .update({ status: "accepted" })
      .eq("hosted_event_id", notif.scene_id)
      .eq("user_id", currentUserId);
    await supabase.from("notifications").delete().eq("id", notif.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    router.push(`/events/${notif.scene_id}`);
  }

  async function declineInvite(notif: AppNotification) {
    if (notif.scene_id) {
      const supabase = createClient();
      await supabase.from("hosted_event_guests")
        .update({ status: "declined" })
        .eq("hosted_event_id", notif.scene_id)
        .eq("user_id", currentUserId);
    }
    await dismiss(notif.id);
  }

  const friendRequests = notifications.filter((n) => n.type === "friend_request");
  const otherNotifs = notifications.filter((n) => n.type !== "friend_request");

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
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: 0, flex: 1 }}>
            Activity
          </h1>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              style={{
                background: "none", border: "none",
                color: "rgba(240,237,232,0.4)", fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Clear All
            </button>
          )}
        </div>

        <div style={{ padding: "12px 16px", paddingBottom: "80px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔔</div>
              <p>No notifications yet</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {/* Friend requests at the top */}
              {friendRequests.length > 0 && (
                <div style={{ marginBottom: "4px" }}>
                  <p style={{ fontSize: "0.7rem", color: "rgba(240,237,232,0.3)", letterSpacing: "0.08em", margin: "0 0 8px", textTransform: "uppercase" }}>
                    Friend Requests · {friendRequests.length}
                  </p>
                  {friendRequests.map((notif) => (
                    <NotifRow
                      key={notif.id}
                      notif={notif}
                      onDismiss={() => dismiss(notif.id)}
                      onAccept={() => acceptFriendRequest(notif)}
                    />
                  ))}
                </div>
              )}

              {otherNotifs.length > 0 && (
                <>
                  {friendRequests.length > 0 && (
                    <p style={{ fontSize: "0.7rem", color: "rgba(240,237,232,0.3)", letterSpacing: "0.08em", margin: "4px 0 8px", textTransform: "uppercase" }}>
                      Notifications
                    </p>
                  )}
                  {otherNotifs.map((notif) => (
                    <NotifRow
                      key={notif.id}
                      notif={notif}
                      onDismiss={() => dismiss(notif.id)}
                      onAccept={
                        notif.type === "scene_invite" || notif.type === "plan_invite"
                          ? () => acceptSceneInvite(notif)
                          : notif.scene_id
                          ? () => router.push(`/events/${notif.scene_id}`)
                          : undefined
                      }
                      onDecline={
                        notif.type === "scene_invite" || notif.type === "plan_invite"
                          ? () => declineInvite(notif)
                          : undefined
                      }
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <BottomNav active="feed" />
      </div>
    </PageShell>
  );
}

function NotifRow({ notif, onDismiss, onAccept, onDecline }: {
  notif: AppNotification;
  onDismiss: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const isActionable = ACTIONABLE_TYPES.includes(notif.type);
  const actor = notif.profiles;

  const displayMessage = notif.type === "friend_request" && actor?.display_name
    ? `${actor.display_name} sent you a friend request`
    : notif.message || "New notification";

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "12px 14px",
      background: notif.read ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.07)",
      borderRadius: "14px",
      border: "1px solid rgba(255,255,255,0.07)",
    }}>
      {/* Avatar */}
      <div style={{
        width: 42, height: 42, borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        overflow: "hidden", flexShrink: 0,
      }}>
        {actor?.avatar_url && (
          <img src={actor.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: "0 0 2px", fontSize: "0.875rem", lineHeight: 1.35 }}>{displayMessage}</p>
        {notif.created_at && (
          <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(240,237,232,0.35)" }}>
            {timeAgo(notif.created_at)}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        {isActionable && onAccept && (
          <button
            onClick={onAccept}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#F0EDE8", border: "none",
              color: "#080808", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem", fontWeight: 700,
            }}
          >
            ✓
          </button>
        )}
        {onDecline ? (
          <button
            onClick={onDecline}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#F0EDE8", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem",
            }}
          >
            ✕
          </button>
        ) : (
          <button
            onClick={onDismiss}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "rgba(240,237,232,0.4)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.7rem",
            }}
          >
            ✕
          </button>
        )}
        {!notif.read && (
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#F0EDE8", flexShrink: 0,
          }} />
        )}
      </div>
    </div>
  );
}

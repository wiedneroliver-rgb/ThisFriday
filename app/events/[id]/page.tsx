"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import PageShell from "@/components/PageShell";
import BottomNav from "@/components/BottomNav";
import ScenePhotos from "@/components/ScenePhotos";
import MusicQueue from "@/components/MusicQueue";
import EditPlanModal from "@/components/EditPlanModal";
import ShareButton from "@/components/ShareButton";
import InviteFriendsModal from "@/components/InviteFriendsModal";
import ReportModal from "@/components/ReportModal";

interface HostedEvent {
  id: string;
  host_id: string;
  title: string;
  location: string | null;
  date: string;
  end_time: string | null;
  flare: string | null;
  photo_url: string | null;
  description: string | null;
  visibility: string | null;
  created_at: string;
  queue_mode: string | null;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Comment {
  id: string;
  hosted_event_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profile?: Profile;
  replies?: Comment[];
  likeCount?: number;
}

const FLARE_COLORS: Record<string, string> = {
  house_party: "#c8841a", pregame: "#4a6b20", bar_crawl: "#20506b",
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
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type SceneTab = "details" | "photos" | "music";

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { userId, profile: myProfile } = useAuth();

  const [event, setEvent] = useState<HostedEvent | null>(null);
  const [host, setHost] = useState<Profile | null>(null);
  const [collaborators, setCollaborators] = useState<Profile[]>([]);
  const [goingProfiles, setGoingProfiles] = useState<Profile[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [sendingComment, setSendingComment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<SceneTab>("details");
  const [showEdit, setShowEdit] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (eventId && userId) loadEvent(); }, [eventId, userId]);

  async function loadEvent() {
    const supabase = createClient();

    const { data: evtData } = await supabase
      .from("hosted_events").select("*").eq("id", eventId).single();
    if (!evtData) { router.push("/feed"); return; }
    setEvent(evtData);

    const { data: hostData } = await supabase
      .from("profiles").select("id,display_name,avatar_url").eq("id", evtData.host_id).single();
    setHost(hostData);

    const { data: guestRows } = await supabase
      .from("hosted_event_guests").select("user_id,status").eq("hosted_event_id", eventId);

    const collabIds = (guestRows || [])
      .filter((g: { status: string }) => g.status === "collaborator")
      .map((g: { user_id: string }) => g.user_id);
    if (collabIds.length > 0) {
      const { data: collabProfs } = await supabase
        .from("profiles").select("id,display_name,avatar_url").in("id", collabIds);
      setCollaborators(collabProfs || []);
    }

    const acceptedGuests = (guestRows || []).filter((g: { status: string }) => ["accepted", "invited"].includes(g.status));
    const guestIds = acceptedGuests.map((g: { user_id: string }) => g.user_id);
    if (guestIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id,display_name,avatar_url").in("id", guestIds);
      setGoingProfiles(profiles || []);
    }

    const joined = acceptedGuests.some((g: { user_id: string; status: string }) =>
      g.user_id === userId && g.status === "accepted"
    );
    setIsJoined(joined || evtData.host_id === userId);
    setLoading(false);

    await loadComments(userId!);
  }

  async function loadComments(uid: string) {
    setLoadingComments(true);
    const supabase = createClient();
    const { data: rawComments } = await supabase
      .from("scene_comments").select("*")
      .eq("hosted_event_id", eventId)
      .order("created_at", { ascending: true });

    if (!rawComments || rawComments.length === 0) {
      setComments([]);
      setLoadingComments(false);
      return;
    }

    const userIds = [...new Set(rawComments.map((c: Comment) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles").select("id,display_name,avatar_url").in("id", userIds);
    const profileMap = Object.fromEntries((profiles || []).map((p: Profile) => [p.id, p]));

    const commentIds = rawComments.map((c: Comment) => c.id);
    const { data: likes } = await supabase
      .from("scene_comment_likes").select("comment_id,user_id").in("comment_id", commentIds);

    const likeCountMap: Record<string, number> = {};
    const myLiked = new Set<string>();
    for (const like of likes || []) {
      likeCountMap[like.comment_id] = (likeCountMap[like.comment_id] || 0) + 1;
      if (like.user_id === uid) myLiked.add(like.comment_id);
    }
    setLikedCommentIds(myLiked);

    const enriched: Comment[] = rawComments.map((c: Comment) => ({
      ...c, profile: profileMap[c.user_id], replies: [], likeCount: likeCountMap[c.id] || 0,
    }));

    const topLevel = enriched.filter((c) => !c.parent_id);
    const replies = enriched.filter((c) => c.parent_id);
    const threaded = topLevel.map((parent) => ({
      ...parent,
      replies: replies.filter((r) => r.parent_id === parent.id),
    }));
    setComments(threaded);
    setLoadingComments(false);
  }

  async function toggleLike(commentId: string) {
    const supabase = createClient();
    if (likedCommentIds.has(commentId)) {
      await supabase.from("scene_comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
      setLikedCommentIds((p) => { const s = new Set(p); s.delete(commentId); return s; });
      setComments((p) => updateLikeCount(p, commentId, -1));
    } else {
      await supabase.from("scene_comment_likes").insert({ comment_id: commentId, user_id: userId });
      setLikedCommentIds((p) => new Set(p).add(commentId));
      setComments((p) => updateLikeCount(p, commentId, 1));
    }
  }

  function updateLikeCount(comments: Comment[], id: string, delta: number): Comment[] {
    return comments.map((c) => {
      if (c.id === id) return { ...c, likeCount: Math.max(0, (c.likeCount || 0) + delta) };
      if (c.replies?.length) return { ...c, replies: updateLikeCount(c.replies, id, delta) };
      return c;
    });
  }

  async function toggleJoin() {
    if (joining) return;
    setJoining(true);
    const supabase = createClient();
    if (isJoined) {
      await supabase.from("hosted_event_guests")
        .delete().eq("hosted_event_id", eventId).eq("user_id", userId);
      setIsJoined(false);
      setGoingProfiles((prev) => prev.filter((p) => p.id !== userId));
    } else {
      await supabase.rpc("join_scene", { p_event_id: eventId, p_user_id: userId });
      setIsJoined(true);
      const myProf = { id: userId!, display_name: myProfile?.display_name || null, avatar_url: myProfile?.avatar_url || null };
      setGoingProfiles((prev) => [...prev, myProf]);
    }
    setJoining(false);
  }

  async function postComment() {
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("scene_comments").insert({
      hosted_event_id: eventId,
      user_id: userId,
      content: commentText.trim(),
      parent_id: replyingTo?.id ?? null,
    }).select().single();
    if (error) { setSendingComment(false); return; }
    if (data) {
      const newComment: Comment = {
        ...data,
        profile: { id: userId!, display_name: myProfile?.display_name || null, avatar_url: myProfile?.avatar_url || null },
        replies: [],
      };
      if (replyingTo) {
        setComments((prev) => prev.map((c) => c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), newComment] } : c));
      } else {
        setComments((prev) => [...prev, newComment]);
      }
    }
    setCommentText("");
    setReplyingTo(null);
    setSendingComment(false);
  }

  if (loading || !event) {
    return (
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
        Loading...
      </div>
    );
  }

  const isOwn = event.host_id === userId;
  const isCollaborator = collaborators.some((c) => c.id === userId);
  const canEdit = isOwn || isCollaborator;
  const flareColor = event.flare ? (FLARE_COLORS[event.flare] || "#555") : null;
  const flareLabel = event.flare ? (FLARE_LABELS[event.flare] || event.flare) : null;
  const visLabel = event.visibility === "public" ? "Public" : event.visibility === "semi_public" ? "Friends" : "Private";

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Hero */}
        <div style={{ position: "relative" }}>
          {event.photo_url ? (
            <>
              <img src={event.photo_url} alt={event.title} style={{ width: "100%", aspectRatio: "4/3", maxHeight: "420px", objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.7) 70%, rgba(0,0,0,0.98) 100%)" }} />
            </>
          ) : (
            <div style={{ height: "200px", background: "rgba(255,255,255,0.03)" }} />
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

          {/* Top-right actions */}
          <div style={{ position: "absolute", top: "52px", right: "16px", display: "flex", gap: "8px" }}>
            {canEdit && (
              <button
                onClick={() => setShowEdit(true)}
                style={{
                  height: 36, borderRadius: "18px", padding: "0 14px",
                  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  color: "#fff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                }}
              >
                Edit
              </button>
            )}
            <button
              onClick={() => setShowReport(true)}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff", cursor: "pointer", display: "flex",
                alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
              }}
            >
              ⋯
            </button>
          </div>

          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              {event.visibility && (
                <span style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "3px 8px", fontSize: "0.7rem", color: "rgba(255,255,255,0.7)" }}>
                  {visLabel}
                </span>
              )}
              {flareLabel && flareColor && (
                <span style={{ background: flareColor + "44", color: flareColor, border: `1px solid ${flareColor}66`, borderRadius: "10px", padding: "3px 8px", fontSize: "0.7rem", fontWeight: 700 }}>
                  {flareLabel}
                </span>
              )}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: "clamp(1.6rem, 5vw, 2rem)", letterSpacing: "-0.03em", margin: "0 0 8px", color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.8)", lineHeight: 1.1 }}>
              {event.title}
            </h1>
            {host && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  onClick={() => router.push(`/profile/${host.id}`)}
                  style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,0.2)", overflow: "hidden", cursor: "pointer" }}
                >
                  {host.avatar_url && <img src={host.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <span
                  onClick={() => router.push(`/profile/${host.id}`)}
                  style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", cursor: "pointer" }}
                >
                  by {host.display_name || "Someone"}
                </span>
                {collaborators.length > 0 && (
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)" }}>
                    + {collaborators.length} co-host{collaborators.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex",
        }}>
          {(["details", "photos", "music"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "12px", background: "none", border: "none",
                color: tab === t ? "#F0EDE8" : "rgba(240,237,232,0.35)",
                fontWeight: tab === t ? 700 : 400,
                fontSize: "0.85rem", cursor: "pointer",
                borderBottom: tab === t ? "2px solid #F0EDE8" : "2px solid transparent",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "details" ? (
          <div style={{ padding: "20px 20px 0" }}>
            {/* Location + Date */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "14px", padding: "14px 16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>📍</span>
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>{event.location}</p>
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🗓</span>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(240,237,232,0.7)" }}>{formatDate(event.date)}</p>
              </div>
            </div>

            {/* Going avatars */}
            {goingProfiles.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" }}>
                    Going · {goingProfiles.length}
                  </p>
                  <button
                    onClick={() => setShowInvite(true)}
                    style={{
                      background: "none", border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "14px", padding: "4px 10px",
                      color: "rgba(240,237,232,0.5)", fontSize: "0.75rem", cursor: "pointer",
                    }}
                  >
                    + Invite
                  </button>
                </div>
                <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "4px" }}>
                  {goingProfiles.map((p) => (
                    <div key={p.id} style={{ flexShrink: 0, textAlign: "center" }}>
                      <div
                        onClick={() => router.push(`/profile/${p.id}`)}
                        style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: "4px", cursor: "pointer" }}
                      >
                        {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      </div>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "rgba(240,237,232,0.45)", maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.display_name?.split(" ")[0] || "?"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div style={{ marginBottom: "20px" }}>
                <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", margin: "0 0 8px", textTransform: "uppercase" }}>About</p>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(240,237,232,0.7)", lineHeight: 1.55 }}>{event.description}</p>
              </div>
            )}

            {/* Comments */}
            <div style={{ marginBottom: "120px" }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.08em", margin: "0 0 12px", textTransform: "uppercase" }}>
                Comments
              </p>
              {loadingComments ? (
                <p style={{ color: "rgba(240,237,232,0.3)", fontSize: "0.85rem" }}>Loading...</p>
              ) : comments.length === 0 ? (
                <p style={{ color: "rgba(240,237,232,0.25)", fontSize: "0.85rem" }}>No comments yet. Be the first!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {comments.map((comment) => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      isLiked={likedCommentIds.has(comment.id)}
                      likedIds={likedCommentIds}
                      onLike={() => toggleLike(comment.id)}
                      onLikeById={(id) => toggleLike(id)}
                      onReply={() => { setReplyingTo(comment); commentInputRef.current?.focus(); }}
                      onViewProfile={(id) => router.push(`/profile/${id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : tab === "photos" ? (
          <ScenePhotos sceneId={eventId} currentUserId={userId!} isHost={canEdit} />
        ) : (
          <MusicQueue sceneId={eventId} currentUserId={userId!} isHost={canEdit} />
        )}

        {/* Fixed bottom bar — only on details tab */}
        {tab === "details" && (
          <div className="event-bottom-bar" style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            background: "rgba(8,8,8,0.97)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(16px)",
            padding: "10px 16px",
            paddingBottom: "calc(10px + env(safe-area-inset-bottom, 8px))",
            zIndex: 55,
          }}>
            <style>{`@media (min-width: 768px) { .event-bottom-bar { left: 220px !important; } }`}</style>
            {replyingTo && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "8px", padding: "6px 10px",
                background: "rgba(255,255,255,0.05)", borderRadius: "8px",
              }}>
                <span style={{ fontSize: "0.78rem", color: "rgba(240,237,232,0.45)" }}>
                  Replying to {replyingTo.profile?.display_name || "someone"}
                </span>
                <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.4)", cursor: "pointer", fontSize: "1rem" }}>×</button>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <ShareButton url={`https://thisfridayapp.com/post/${event.id}`} title={event.title} />
              <input
                ref={commentInputRef}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") postComment(); }}
                placeholder="Comment..."
                style={{
                  flex: 1, background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "22px", padding: "10px 16px",
                  color: "#F0EDE8", fontSize: "0.9rem", outline: "none",
                }}
              />
              {commentText.trim() ? (
                <button
                  onClick={postComment}
                  disabled={sendingComment}
                  style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "#F0EDE8", border: "none",
                    color: "#080808", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem", flexShrink: 0, opacity: sendingComment ? 0.5 : 1,
                  }}
                >
                  ↑
                </button>
              ) : !isOwn ? (
                <button
                  onClick={toggleJoin}
                  disabled={joining}
                  style={{
                    background: isJoined ? "rgba(255,255,255,0.1)" : "#F0EDE8",
                    color: isJoined ? "#F0EDE8" : "#080808",
                    border: isJoined ? "1px solid rgba(255,255,255,0.15)" : "none",
                    borderRadius: "22px", padding: "10px 18px",
                    fontWeight: 700, fontSize: "0.85rem",
                    cursor: joining ? "not-allowed" : "pointer",
                    opacity: joining ? 0.6 : 1, flexShrink: 0,
                  }}
                >
                  {isJoined ? "Going ✓" : "I'm going"}
                </button>
              ) : null}
            </div>
          </div>
        )}

        {/* Modals */}
        {showEdit && event && (
          <EditPlanModal
            event={event}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => { setEvent((prev) => prev ? { ...prev, ...updated } : prev); setShowEdit(false); }}
          />
        )}
        {showInvite && (
          <InviteFriendsModal
            currentUserId={userId!}
            onClose={() => setShowInvite(false)}
            onInvite={async (ids) => {
              const supabase = createClient();
              for (const uid of ids) {
                await supabase.from("hosted_event_guests").upsert({
                  hosted_event_id: eventId,
                  user_id: uid,
                  status: "invited",
                  invited_by: userId,
                }, { onConflict: "hosted_event_id,user_id" });
                await supabase.from("notifications").insert({
                  user_id: uid, actor_id: userId,
                  type: "scene_invite", scene_id: eventId, read: false,
                });
              }
              setShowInvite(false);
            }}
          />
        )}
        {showReport && (
          <ReportModal
            type="scene"
            targetId={eventId}
            reporterId={userId!}
            onClose={() => setShowReport(false)}
          />
        )}

        <BottomNav active="events" />
      </div>
    </PageShell>
  );
}

function CommentItem({ comment, onReply, onLike, onLikeById, isLiked, likedIds, onViewProfile, depth = 0 }: {
  comment: Comment;
  onReply: () => void;
  onLike: () => void;
  onLikeById: (id: string) => void;
  isLiked: boolean;
  likedIds: Set<string>;
  onViewProfile: (id: string) => void;
  depth?: number;
}) {
  return (
    <div style={{ marginLeft: depth > 0 ? "36px" : 0 }}>
      <div style={{ display: "flex", gap: "10px", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div
          onClick={() => onViewProfile(comment.user_id)}
          style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0, cursor: "pointer" }}
        >
          {comment.profile?.avatar_url && <img src={comment.profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "3px" }}>
            <span style={{ fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }} onClick={() => onViewProfile(comment.user_id)}>
              {comment.profile?.display_name || "Someone"}
            </span>
            <span style={{ color: "rgba(240,237,232,0.3)", fontSize: "0.72rem" }}>{timeAgo(comment.created_at)}</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.88rem", color: "rgba(240,237,232,0.8)", lineHeight: 1.4 }}>{comment.content}</p>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "6px" }}>
            {depth === 0 && (
              <button onClick={onReply} style={{ background: "none", border: "none", color: "rgba(240,237,232,0.3)", fontSize: "0.72rem", cursor: "pointer", padding: 0 }}>
                Reply
              </button>
            )}
            <button
              onClick={onLike}
              style={{ background: "none", border: "none", color: isLiked ? "#e05a8a" : "rgba(240,237,232,0.3)", fontSize: "0.72rem", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "4px" }}
            >
              <span style={{ fontSize: "0.85rem" }}>{isLiked ? "♥" : "♡"}</span>
              {(comment.likeCount || 0) > 0 && <span>{comment.likeCount}</span>}
            </button>
          </div>
        </div>
      </div>
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          onReply={onReply}
          onLike={() => onLikeById(reply.id)}
          onLikeById={onLikeById}
          isLiked={likedIds?.has(reply.id) ?? false}
          likedIds={likedIds}
          onViewProfile={onViewProfile}
          depth={1}
        />
      ))}
    </div>
  );
}

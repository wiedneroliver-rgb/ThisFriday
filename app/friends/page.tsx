"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth-context";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  username: string | null;
  mutualCount?: number;
}

type FriendTab = "friends" | "requests" | "suggested";
type FriendState = "none" | "pending_sent" | "pending_received" | "friends";

export default function FriendsPage() {
  const router = useRouter();
  const { userId } = useAuth();
  const [tab, setTab] = useState<FriendTab>("friends");
  const [friends, setFriends] = useState<Profile[]>([]);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());
  const [pendingReceivedIds, setPendingReceivedIds] = useState<Set<string>>(new Set());
  const [friendRequests, setFriendRequests] = useState<Profile[]>([]);
  const [suggested, setSuggested] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();

    // Load friends
    const { data: friendRows } = await supabase
      .from("friends").select("friend_id").eq("user_id", userId);
    const ids = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);
    setFriendIds(new Set(ids));

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id,display_name,avatar_url,username").in("id", ids);
      setFriends(profiles || []);
    }

    // Load favourite friends
    const { data: favRows } = await supabase
      .from("favourite_friends").select("friend_id").eq("user_id", userId);
    setFavouriteIds(new Set((favRows || []).map((r: { friend_id: string }) => r.friend_id)));

    // Load pending sent requests (notifications we sent)
    const { data: sentNotifs } = await supabase
      .from("notifications")
      .select("actor_id")
      .eq("actor_id", userId)
      .eq("type", "friend_request");
    setPendingSentIds(new Set((sentNotifs || []).map((n: { actor_id: string }) => n.actor_id)));

    // Load pending received requests
    const { data: receivedNotifs } = await supabase
      .from("notifications")
      .select("actor_id, profiles!actor_id(id,display_name,avatar_url,username)")
      .eq("user_id", userId)
      .eq("type", "friend_request");

    // Supabase returns the foreign key join as an array; take first element
    const receivedProfiles: Profile[] = (receivedNotifs || []).map((n: {
      actor_id: string;
      profiles: { id: string; display_name: string | null; avatar_url: string | null; username: string | null }[] | { id: string; display_name: string | null; avatar_url: string | null; username: string | null } | null;
    }) => {
      const p = Array.isArray(n.profiles) ? n.profiles[0] : n.profiles;
      return p as Profile;
    }).filter(Boolean);
    setFriendRequests(receivedProfiles);
    setPendingReceivedIds(new Set(receivedProfiles.map((p) => p.id)));

    setLoading(false);

    // Load suggested (friends-of-friends not already friends)
    if (ids.length > 0) {
      const { data: fof } = await supabase
        .from("friends")
        .select("friend_id")
        .in("user_id", ids)
        .neq("friend_id", userId);

      const fofIds = (fof || []).map((r: { friend_id: string }) => r.friend_id)
        .filter((id: string) => !new Set(ids).has(id));
      const uniqueFofIds = [...new Set(fofIds)] as string[];

      if (uniqueFofIds.length > 0) {
        const { data: sugProfiles } = await supabase
          .from("profiles").select("id,display_name,avatar_url,username")
          .in("id", uniqueFofIds)
          .limit(20);

        // Count mutuals
        const withMutuals = (sugProfiles || []).map((p: Profile) => ({
          ...p,
          mutualCount: fofIds.filter((id: string) => id === p.id).length,
        }));
        setSuggested(withMutuals);
      }
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  async function handleSearch(query: string) {
    setSearch(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
      .neq("id", userId)
      .limit(20);
    setSearchResults(data || []);
    setSearching(false);
  }

  async function sendRequest(targetId: string) {
    if (!userId) return;
    setPendingSentIds((p) => new Set(p).add(targetId));
    const supabase = createClient();
    // Insert friend_request notification — NOT direct friends insert
    await supabase.from("notifications").insert({
      user_id: targetId,
      actor_id: userId,
      type: "friend_request",
      message: null,
      read: false,
    });
  }

  async function cancelRequest(targetId: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("notifications")
      .delete()
      .eq("actor_id", userId)
      .eq("user_id", targetId)
      .eq("type", "friend_request");
    setPendingSentIds((p) => { const s = new Set(p); s.delete(targetId); return s; });
  }

  async function acceptRequest(requesterId: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.rpc("accept_friend_request", {
      p_requester_id: requesterId,
      p_accepter_id: userId,
    });
    // Remove from requests, add to friends
    setFriendRequests((prev) => prev.filter((p) => p.id !== requesterId));
    setPendingReceivedIds((p) => { const s = new Set(p); s.delete(requesterId); return s; });
    setFriendIds((p) => new Set(p).add(requesterId));
    // Reload friends list
    const supabase2 = createClient();
    const { data } = await supabase2.from("profiles").select("id,display_name,avatar_url,username").eq("id", requesterId).single();
    if (data) setFriends((prev) => [data, ...prev]);
  }

  async function declineRequest(requesterId: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("notifications")
      .delete()
      .eq("actor_id", requesterId)
      .eq("user_id", userId)
      .eq("type", "friend_request");
    setFriendRequests((prev) => prev.filter((p) => p.id !== requesterId));
    setPendingReceivedIds((p) => { const s = new Set(p); s.delete(requesterId); return s; });
  }

  async function removeFriend(targetId: string) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("friends").delete()
      .or(`and(user_id.eq.${userId},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${userId})`);
    setFriendIds((p) => { const s = new Set(p); s.delete(targetId); return s; });
    setFriends((prev) => prev.filter((f) => f.id !== targetId));
  }

  async function toggleFavourite(targetId: string) {
    if (!userId) return;
    const supabase = createClient();
    if (favouriteIds.has(targetId)) {
      await supabase.from("favourite_friends")
        .delete().eq("user_id", userId).eq("friend_id", targetId);
      setFavouriteIds((p) => { const s = new Set(p); s.delete(targetId); return s; });
    } else {
      await supabase.from("favourite_friends").insert({ user_id: userId, friend_id: targetId });
      setFavouriteIds((p) => new Set(p).add(targetId));
    }
  }

  function getFriendState(targetId: string): FriendState {
    if (friendIds.has(targetId)) return "friends";
    if (pendingSentIds.has(targetId)) return "pending_sent";
    if (pendingReceivedIds.has(targetId)) return "pending_received";
    return "none";
  }

  const showSearch = search.trim().length >= 2;
  const sortedFriends = [...friends].sort((a, b) => {
    const af = favouriteIds.has(a.id) ? 0 : 1;
    const bf = favouriteIds.has(b.id) ? 0 : 1;
    return af - bf;
  });

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
          padding: "16px 16px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            Friends
          </h1>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name or username..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              padding: "10px 14px",
              color: "#F0EDE8",
              fontSize: "0.9rem",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: "12px",
            }}
          />
          {/* Tabs */}
          {!showSearch && (
            <div style={{ display: "flex" }}>
              {(["friends", "requests", "suggested"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: "10px 4px", background: "none", border: "none",
                    color: tab === t ? "#F0EDE8" : "rgba(240,237,232,0.35)",
                    fontWeight: tab === t ? 700 : 400,
                    fontSize: "0.85rem", cursor: "pointer",
                    borderBottom: tab === t ? "2px solid #F0EDE8" : "2px solid transparent",
                    textTransform: "capitalize",
                    position: "relative",
                  }}
                >
                  {t === "requests" ? "Requests" : t === "suggested" ? "Suggested" : "Friends"}
                  {t === "requests" && friendRequests.length > 0 && (
                    <span style={{
                      position: "absolute", top: "6px", right: "8px",
                      background: "#e05a5a", color: "#fff",
                      fontSize: "0.6rem", fontWeight: 800,
                      width: 16, height: 16, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {friendRequests.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", paddingBottom: "80px" }}>
          {showSearch ? (
            <>
              <p style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", marginBottom: "10px" }}>
                {searching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}
              </p>
              {searchResults.map((profile) => (
                <PersonRow
                  key={profile.id}
                  profile={profile}
                  state={getFriendState(profile.id)}
                  isFavourite={false}
                  onAdd={() => sendRequest(profile.id)}
                  onCancel={() => cancelRequest(profile.id)}
                  onRemove={() => removeFriend(profile.id)}
                  onAccept={() => acceptRequest(profile.id)}
                  onViewProfile={() => router.push(`/profile/${profile.id}`)}
                />
              ))}
            </>
          ) : tab === "friends" ? (
            <>
              <p style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", marginBottom: "10px" }}>
                {loading ? "Loading..." : `${friends.length} friend${friends.length !== 1 ? "s" : ""}`}
              </p>
              {!loading && friends.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
                  <p style={{ fontSize: "1.1rem", marginBottom: "8px" }}>No friends yet</p>
                  <p style={{ fontSize: "0.85rem" }}>Search by name to find people</p>
                </div>
              )}
              {sortedFriends.map((profile) => (
                <PersonRow
                  key={profile.id}
                  profile={profile}
                  state="friends"
                  isFavourite={favouriteIds.has(profile.id)}
                  onAdd={() => {}}
                  onCancel={() => {}}
                  onRemove={() => removeFriend(profile.id)}
                  onAccept={() => {}}
                  onToggleFavourite={() => toggleFavourite(profile.id)}
                  onViewProfile={() => router.push(`/profile/${profile.id}`)}
                />
              ))}
            </>
          ) : tab === "requests" ? (
            <>
              {friendRequests.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
                  <p>No pending friend requests</p>
                </div>
              ) : (
                friendRequests.map((profile) => (
                  <div key={profile.id} style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div
                      onClick={() => router.push(`/profile/${profile.id}`)}
                      style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "rgba(255,255,255,0.1)",
                        overflow: "hidden", flexShrink: 0, cursor: "pointer",
                      }}
                    >
                      {profile.avatar_url && (
                        <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: "0 0 2px" }}>
                        {profile.display_name || "Unknown"}
                      </p>
                      {profile.username && (
                        <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.78rem", margin: 0 }}>
                          @{profile.username}
                        </p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => acceptRequest(profile.id)}
                        style={{
                          background: "#F0EDE8", border: "none", borderRadius: "20px",
                          padding: "7px 14px", color: "#080808", fontWeight: 700,
                          fontSize: "0.8rem", cursor: "pointer",
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineRequest(profile.id)}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "20px", padding: "7px 14px",
                          color: "rgba(240,237,232,0.5)", fontSize: "0.8rem", cursor: "pointer",
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          ) : (
            // Suggested tab
            <>
              {suggested.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
                  <p>No suggestions yet</p>
                  <p style={{ fontSize: "0.85rem", marginTop: "8px" }}>Add more friends to get suggestions</p>
                </div>
              ) : (
                suggested.map((profile) => (
                  <PersonRow
                    key={profile.id}
                    profile={profile}
                    state={getFriendState(profile.id)}
                    isFavourite={false}
                    onAdd={() => sendRequest(profile.id)}
                    onCancel={() => cancelRequest(profile.id)}
                    onRemove={() => removeFriend(profile.id)}
                    onAccept={() => acceptRequest(profile.id)}
                    onViewProfile={() => router.push(`/profile/${profile.id}`)}
                    mutualCount={profile.mutualCount}
                  />
                ))
              )}
            </>
          )}
        </div>

        <BottomNav active="friends" />
      </div>
    </PageShell>
  );
}

function PersonRow({ profile, state, isFavourite, onAdd, onCancel, onRemove, onAccept, onToggleFavourite, onViewProfile, mutualCount }: {
  profile: Profile;
  state: FriendState;
  isFavourite: boolean;
  onAdd: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onAccept: () => void;
  onToggleFavourite?: () => void;
  onViewProfile: () => void;
  mutualCount?: number;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div
        onClick={onViewProfile}
        style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          overflow: "hidden", flexShrink: 0, cursor: "pointer",
        }}
      >
        {profile.avatar_url && (
          <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={onViewProfile}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: "0 0 1px" }}>
          {profile.display_name || "Unknown"}
        </p>
        {profile.username && (
          <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.75rem", margin: 0 }}>@{profile.username}</p>
        )}
        {mutualCount && mutualCount > 0 ? (
          <p style={{ color: "rgba(240,237,232,0.35)", fontSize: "0.72rem", margin: "1px 0 0" }}>
            {mutualCount} mutual friend{mutualCount !== 1 ? "s" : ""}
          </p>
        ) : null}
      </div>

      {/* Favourite star for friends */}
      {state === "friends" && onToggleFavourite && (
        <button
          onClick={onToggleFavourite}
          style={{
            background: "none", border: "none",
            color: isFavourite ? "#f5c842" : "rgba(240,237,232,0.2)",
            fontSize: "1.1rem", cursor: "pointer", padding: "4px",
          }}
        >
          {isFavourite ? "★" : "☆"}
        </button>
      )}

      {/* Action button */}
      {state === "friends" ? (
        <button
          onClick={onRemove}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px", padding: "6px 14px",
            color: "rgba(240,237,232,0.6)", fontSize: "0.8rem", cursor: "pointer",
          }}
        >
          Friends
        </button>
      ) : state === "pending_sent" ? (
        <button
          onClick={onCancel}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px", padding: "6px 14px",
            color: "rgba(240,237,232,0.5)", fontSize: "0.8rem", cursor: "pointer",
          }}
        >
          Pending
        </button>
      ) : state === "pending_received" ? (
        <button
          onClick={onAccept}
          style={{
            background: "#F0EDE8", border: "none",
            borderRadius: "20px", padding: "6px 14px",
            color: "#080808", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}
        >
          Accept
        </button>
      ) : (
        <button
          onClick={onAdd}
          style={{
            background: "#F0EDE8", border: "none",
            borderRadius: "20px", padding: "6px 14px",
            color: "#080808", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer",
          }}
        >
          Add
        </button>
      )}
    </div>
  );
}

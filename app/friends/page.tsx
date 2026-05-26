"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  phone?: string | null;
}

export default function FriendsPage() {
  const router = useRouter();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState("");
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadFriends(); }, []);

  async function loadFriends() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const userId = user.id.toLowerCase();
    setCurrentUserId(userId);

    const { data: friendRows } = await supabase
      .from("friends").select("friend_id").eq("user_id", userId);
    const ids = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);
    setFriendIds(new Set(ids));

    if (ids.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles").select("id,display_name,avatar_url").in("id", ids);
      setFriends(profiles || []);
    }
    setLoading(false);
  }

  async function handleSearch(query: string) {
    setSearch(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .ilike("display_name", `%${query}%`)
      .neq("id", currentUserId)
      .limit(20);
    setSearchResults(data || []);
    setSearching(false);
  }

  async function addFriend(userId: string) {
    setPendingIds((p) => new Set(p).add(userId));
    const supabase = createClient();
    await supabase.from("friends").insert([
      { user_id: currentUserId, friend_id: userId },
      { user_id: userId, friend_id: currentUserId },
    ]);
    setFriendIds((p) => new Set(p).add(userId));
    setPendingIds((p) => { const s = new Set(p); s.delete(userId); return s; });
  }

  async function removeFriend(userId: string) {
    const supabase = createClient();
    await supabase.from("friends").delete()
      .or(`and(user_id.eq.${currentUserId},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${currentUserId})`);
    setFriendIds((p) => { const s = new Set(p); s.delete(userId); return s; });
    setFriends((prev) => prev.filter((f) => f.id !== userId));
  }

  const showSearch = search.trim().length >= 2;

  return (
    <PageShell>
    <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
          Friends
        </h1>
        <input
          type="text"
          placeholder="Search by name..."
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
          }}
        />
      </div>

      <div style={{ padding: "12px 16px", paddingBottom: "80px" }}>
        {showSearch ? (
          <>
            <p style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", marginBottom: "10px" }}>
              {searching ? "Searching..." : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""}`}
            </p>
            {searchResults.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                isFriend={friendIds.has(profile.id)}
                isPending={pendingIds.has(profile.id)}
                onAdd={() => addFriend(profile.id)}
                onRemove={() => removeFriend(profile.id)}
              />
            ))}
          </>
        ) : (
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
            {friends.map((profile) => (
              <ProfileRow
                key={profile.id}
                profile={profile}
                isFriend={true}
                isPending={false}
                onAdd={() => {}}
                onRemove={() => removeFriend(profile.id)}
              />
            ))}
          </>
        )}
      </div>

      <BottomNav active="friends" />
    </div>
    </PageShell>
  );
}

function ProfileRow({ profile, isFriend, isPending, onAdd, onRemove }: {
  profile: Profile;
  isFriend: boolean;
  isPending: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: "50%",
        background: "rgba(255,255,255,0.1)",
        overflow: "hidden", flexShrink: 0,
      }}>
        {profile.avatar_url && (
          <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem", margin: 0 }}>
          {profile.display_name || "Unknown"}
        </p>
      </div>
      {isFriend ? (
        <button
          onClick={onRemove}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "20px",
            padding: "6px 14px",
            color: "rgba(240,237,232,0.6)",
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          Friends
        </button>
      ) : (
        <button
          onClick={onAdd}
          disabled={isPending}
          style={{
            background: "#F0EDE8",
            border: "none",
            borderRadius: "20px",
            padding: "6px 14px",
            color: "#080808",
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}
        >
          {isPending ? "Adding..." : "Add"}
        </button>
      )}
    </div>
  );
}

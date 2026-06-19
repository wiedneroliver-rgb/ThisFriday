"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/lib/types";
import { getInitials } from "@/lib/utils";

interface Props {
  userId: string;
  selected: string[]; // array of user IDs
  onChange: (ids: string[]) => void;
  onClose: () => void;
  title?: string;
}

export default function InviteFriendsModal({
  userId,
  selected,
  onChange,
  onClose,
  title = "Invite Friends",
}: Props) {
  const [friends, setFriends] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFriends();
  }, [userId]);

  async function loadFriends() {
    const supabase = createClient();
    const { data: friendRows } = await supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", userId);
    const ids = (friendRows || []).map((r: { friend_id: string }) => r.friend_id);
    if (ids.length === 0) { setLoading(false); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url,username")
      .in("id", ids)
      .order("display_name");
    setFriends(profiles || []);
    setLoading(false);
  }

  function toggle(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  function selectAll() {
    onChange(filtered.map((f) => f.id));
  }

  function clearAll() {
    onChange([]);
  }

  const filtered = search.trim()
    ? friends.filter((f) =>
        f.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        f.username?.toLowerCase().includes(search.toLowerCase())
      )
    : friends;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#121212", borderRadius: "20px 20px 0 0",
        width: "100%", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "12px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>{title}</h3>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%",
              width: 30, height: 30, color: "#F0EDE8", cursor: "pointer",
            }}>✕</button>
          </div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
              padding: "10px 14px", color: "#F0EDE8", fontSize: "0.9rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
          {filtered.length > 0 && (
            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={selectAll} style={{
                background: "none", border: "none", color: "rgba(240,237,232,0.5)",
                fontSize: "0.78rem", cursor: "pointer", padding: 0,
              }}>Select all</button>
              <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
              <button onClick={clearAll} style={{
                background: "none", border: "none", color: "rgba(240,237,232,0.5)",
                fontSize: "0.78rem", cursor: "pointer", padding: 0,
              }}>Clear</button>
              {selected.length > 0 && (
                <>
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                  <span style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.78rem" }}>
                    {selected.length} selected
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Friend list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading ? (
            <p style={{ padding: "24px", color: "rgba(240,237,232,0.3)", textAlign: "center" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: "24px", color: "rgba(240,237,232,0.3)", textAlign: "center" }}>
              {search ? "No friends found" : "No friends yet"}
            </p>
          ) : (
            filtered.map((friend) => {
              const isSelected = selected.includes(friend.id);
              return (
                <button
                  key={friend.id}
                  onClick={() => toggle(friend.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    width: "100%", padding: "12px 20px",
                    background: isSelected ? "rgba(240,237,232,0.06)" : "none",
                    border: "none", cursor: "pointer",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", color: "rgba(240,237,232,0.6)", fontWeight: 700,
                  }}>
                    {friend.avatar_url
                      ? <img src={friend.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : getInitials(friend.display_name)
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>
                      {friend.display_name || "Unknown"}
                    </p>
                    {friend.username && (
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(240,237,232,0.4)" }}>
                        @{friend.username}
                      </p>
                    )}
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%",
                    border: isSelected ? "none" : "2px solid rgba(255,255,255,0.2)",
                    background: isSelected ? "#F0EDE8" : "none",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#080808", fontSize: "0.75rem", fontWeight: 800, flexShrink: 0,
                  }}>
                    {isSelected && "✓"}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Done */}
        <div style={{
          padding: "16px 20px",
          paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", background: "#F0EDE8", color: "#080808",
              border: "none", borderRadius: "12px", padding: "14px",
              fontWeight: 800, fontSize: "0.95rem", cursor: "pointer",
            }}
          >
            Done {selected.length > 0 ? `(${selected.length} invited)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

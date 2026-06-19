"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { SceneSong, Profile } from "@/lib/types";

interface Props {
  sceneId: string;
  currentUserId: string;
  isHost: boolean;
}

export default function MusicQueue({ sceneId, currentUserId, isHost }: Props) {
  const [songs, setSongs] = useState<SceneSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSongs();
    // Realtime subscription
    const supabase = createClient();
    const channel = supabase
      .channel(`music-queue-${sceneId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scene_songs", filter: `hosted_event_id=eq.${sceneId}` },
        () => loadSongs()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "scene_song_votes" },
        () => loadSongs()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sceneId]);

  async function loadSongs() {
    const supabase = createClient();
    const { data: rawSongs } = await supabase
      .from("scene_songs")
      .select("*")
      .eq("hosted_event_id", sceneId)
      .order("created_at", { ascending: true });

    if (!rawSongs || rawSongs.length === 0) {
      setSongs([]);
      setLoading(false);
      return;
    }

    const songIds = rawSongs.map((s: SceneSong) => s.id);
    const { data: votes } = await supabase
      .from("scene_song_votes")
      .select("song_id,user_id")
      .in("song_id", songIds);

    const voteCountMap: Record<string, number> = {};
    const myVotes = new Set<string>();
    for (const v of votes || []) {
      voteCountMap[v.song_id] = (voteCountMap[v.song_id] || 0) + 1;
      if (v.user_id === currentUserId) myVotes.add(v.song_id);
    }

    const enriched: SceneSong[] = rawSongs.map((s: SceneSong) => ({
      ...s,
      voteCount: voteCountMap[s.id] || 0,
      votedByMe: myVotes.has(s.id),
    }));

    // Sort: queued first (by votes), then played/blocked last
    enriched.sort((a, b) => {
      const aActive = a.status !== "played" && a.status !== "blocked";
      const bActive = b.status !== "played" && b.status !== "blocked";
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (b.voteCount || 0) - (a.voteCount || 0);
    });

    setSongs(enriched);
    setLoading(false);
  }

  async function suggest() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    const supabase = createClient();
    await supabase.from("scene_songs").insert({
      hosted_event_id: sceneId,
      user_id: currentUserId,
      title: title.trim(),
      artist: artist.trim() || "Unknown",
      apple_music_id: null,
      spotify_id: null,
      artwork_url: null,
      status: "queued",
    });
    setTitle("");
    setArtist("");
    setSubmitting(false);
  }

  async function toggleVote(song: SceneSong) {
    const supabase = createClient();
    if (song.votedByMe) {
      await supabase.from("scene_song_votes")
        .delete()
        .eq("song_id", song.id)
        .eq("user_id", currentUserId);
    } else {
      await supabase.from("scene_song_votes").insert({
        song_id: song.id,
        user_id: currentUserId,
      });
    }
    setSongs((prev) => prev.map((s) => {
      if (s.id !== song.id) return s;
      return {
        ...s,
        votedByMe: !s.votedByMe,
        voteCount: (s.voteCount || 0) + (s.votedByMe ? -1 : 1),
      };
    }));
  }

  async function setStatus(song: SceneSong, status: string) {
    const supabase = createClient();
    await supabase.from("scene_songs")
      .update({ status })
      .eq("id", song.id);
    setSongs((prev) => prev.map((s) => s.id === song.id ? { ...s, status } : s));
  }

  async function deleteSong(id: string) {
    const supabase = createClient();
    await supabase.from("scene_songs").delete().eq("id", id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }

  const activeSongs = songs.filter((s) => s.status !== "played" && s.status !== "blocked");
  const playedSongs = songs.filter((s) => s.status === "played" || s.status === "blocked");

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Suggest a song */}
      <div style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "14px", padding: "16px", marginBottom: "20px",
      }}>
        <p style={{ fontSize: "0.78rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.06em", margin: "0 0 12px", textTransform: "uppercase" }}>
          Suggest a Song
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") suggest(); }}
          placeholder="Song title..."
          style={{
            width: "100%", background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
            padding: "10px 14px", color: "#F0EDE8", fontSize: "0.9rem",
            outline: "none", marginBottom: "8px", boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") suggest(); }}
            placeholder="Artist (optional)"
            style={{
              flex: 1, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
              padding: "10px 14px", color: "#F0EDE8", fontSize: "0.9rem",
              outline: "none",
            }}
          />
          <button
            onClick={suggest}
            disabled={!title.trim() || submitting}
            style={{
              background: title.trim() ? "#F0EDE8" : "rgba(255,255,255,0.15)",
              color: title.trim() ? "#080808" : "rgba(240,237,232,0.4)",
              border: "none", borderRadius: "10px", padding: "10px 16px",
              fontWeight: 700, fontSize: "0.85rem", cursor: title.trim() ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "..." : "Add"}
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "rgba(240,237,232,0.3)", textAlign: "center", padding: "24px 0" }}>Loading...</p>
      ) : songs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,237,232,0.25)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>🎵</p>
          <p style={{ fontSize: "0.875rem" }}>No songs yet. Suggest something!</p>
        </div>
      ) : (
        <>
          {activeSongs.length > 0 && (
            <div style={{ marginBottom: "24px" }}>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.3)", letterSpacing: "0.08em", margin: "0 0 10px", textTransform: "uppercase" }}>
                Queue · {activeSongs.length}
              </p>
              {activeSongs.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  isHost={isHost}
                  isOwn={song.user_id === currentUserId}
                  onVote={() => toggleVote(song)}
                  onStatus={(s) => setStatus(song, s)}
                  onDelete={() => deleteSong(song.id)}
                />
              ))}
            </div>
          )}

          {playedSongs.length > 0 && (
            <div>
              <p style={{ fontSize: "0.72rem", color: "rgba(240,237,232,0.3)", letterSpacing: "0.08em", margin: "0 0 10px", textTransform: "uppercase" }}>
                Played / Blocked
              </p>
              {playedSongs.map((song) => (
                <SongRow
                  key={song.id}
                  song={song}
                  isHost={isHost}
                  isOwn={song.user_id === currentUserId}
                  onVote={() => {}}
                  onStatus={(s) => setStatus(song, s)}
                  onDelete={() => deleteSong(song.id)}
                  dimmed
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SongRow({ song, isHost, isOwn, onVote, onStatus, onDelete, dimmed }: {
  song: SceneSong;
  isHost: boolean;
  isOwn: boolean;
  onVote: () => void;
  onStatus: (status: string) => void;
  onDelete: () => void;
  dimmed?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      opacity: dimmed ? 0.5 : 1,
    }}>
      {/* Artwork placeholder */}
      <div style={{
        width: 44, height: 44, borderRadius: "8px",
        background: "rgba(255,255,255,0.07)", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.2rem", overflow: "hidden",
      }}>
        {song.artwork_url
          ? <img src={song.artwork_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : "🎵"
        }
      </div>

      {/* Song info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {song.title}
        </p>
        <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(240,237,232,0.4)" }}>
          {song.artist}
        </p>
      </div>

      {/* Vote */}
      {!dimmed && (
        <button
          onClick={onVote}
          style={{
            display: "flex", alignItems: "center", gap: "4px",
            background: song.votedByMe ? "rgba(240,237,232,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${song.votedByMe ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "20px", padding: "5px 10px",
            color: song.votedByMe ? "#F0EDE8" : "rgba(240,237,232,0.45)",
            fontSize: "0.78rem", cursor: "pointer",
          }}
        >
          ▲ {song.voteCount || 0}
        </button>
      )}

      {/* Host controls */}
      {isHost && !dimmed && (
        <div style={{ display: "flex", gap: "4px" }}>
          <button
            onClick={() => onStatus("played")}
            title="Mark played"
            style={{
              background: "rgba(255,255,255,0.06)", border: "none",
              borderRadius: "6px", padding: "5px 8px",
              color: "rgba(240,237,232,0.5)", cursor: "pointer", fontSize: "0.8rem",
            }}
          >✓</button>
          <button
            onClick={() => onStatus("blocked")}
            title="Block"
            style={{
              background: "rgba(224,90,90,0.1)", border: "none",
              borderRadius: "6px", padding: "5px 8px",
              color: "#e05a5a", cursor: "pointer", fontSize: "0.8rem",
            }}
          >✕</button>
        </div>
      )}

      {/* Own delete */}
      {isOwn && !isHost && (
        <button
          onClick={onDelete}
          style={{
            background: "none", border: "none",
            color: "rgba(240,237,232,0.25)", cursor: "pointer", fontSize: "0.8rem",
          }}
        >🗑</button>
      )}

      {/* Status badge */}
      {song.status === "blocked" && (
        <span style={{ fontSize: "0.7rem", color: "#e05a5a", background: "rgba(224,90,90,0.1)", borderRadius: "6px", padding: "2px 6px" }}>
          blocked
        </span>
      )}
      {song.status === "played" && (
        <span style={{ fontSize: "0.7rem", color: "rgba(240,237,232,0.3)", background: "rgba(255,255,255,0.05)", borderRadius: "6px", padding: "2px 6px" }}>
          played
        </span>
      )}
    </div>
  );
}

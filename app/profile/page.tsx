"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const userId = user.id.toLowerCase();

    const { data } = await supabase
      .from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      setDisplayName(data.display_name || "");
      setBio(data.bio || "");
    }

    const { count: fc } = await supabase
      .from("friends").select("*", { count: "exact", head: true }).eq("user_id", userId);
    setFriendCount(fc || 0);

    const { count: ec } = await supabase
      .from("hosted_events").select("*", { count: "exact", head: true }).eq("host_id", userId);
    setEventCount(ec || 0);
  }

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("profiles").update({
      display_name: displayName,
      bio: bio,
    }).eq("id", profile.id);
    setProfile((p) => p ? { ...p, display_name: displayName, bio: bio } : p);
    setEditing(false);
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    if (!profile) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `avatars/${profile.id}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
      setProfile((p) => p ? { ...p, avatar_url: publicUrl } : p);
    }
    setUploading(false);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) {
    return (
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
        Loading...
      </div>
    );
  }

  return (
    <PageShell><div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: 0 }}>Profile</h1>
        <button
          onClick={() => editing ? saveProfile() : setEditing(true)}
          disabled={saving}
          style={{
            background: editing ? "#F0EDE8" : "rgba(255,255,255,0.08)",
            color: editing ? "#080808" : "#F0EDE8",
            border: "none", borderRadius: "20px",
            padding: "7px 16px", fontWeight: 600, fontSize: "0.85rem",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : editing ? "Save" : "Edit"}
        </button>
      </div>

      <div style={{ padding: "24px 16px", paddingBottom: "80px", maxWidth: "480px", margin: "0 auto" }}>
        {/* Avatar */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
          <div
            onClick={() => editing && fileRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden", marginBottom: "10px",
              cursor: editing ? "pointer" : "default",
              position: "relative",
            }}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
                {(profile.display_name || "?")[0].toUpperCase()}
              </div>
            )}
            {editing && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.7rem", color: "#F0EDE8",
              }}>
                {uploading ? "..." : "Change"}
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
          />
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: "1px",
          background: "rgba(255,255,255,0.05)",
          borderRadius: "14px", overflow: "hidden",
          marginBottom: "24px",
        }}>
          {[
            { label: "Friends", value: friendCount },
            { label: "Events", value: eventCount },
          ].map((stat) => (
            <div key={stat.label} style={{
              flex: 1, textAlign: "center", padding: "16px 8px",
              background: "rgba(255,255,255,0.03)",
            }}>
              <p style={{ fontWeight: 800, fontSize: "1.5rem", margin: 0 }}>{stat.value}</p>
              <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.75rem", margin: "2px 0 0" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.4)", display: "block", marginBottom: "6px" }}>
              Display Name
            </label>
            {editing ? (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: "100%", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
                  padding: "12px 14px", color: "#F0EDE8", fontSize: "0.95rem", outline: "none",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>
                {profile.display_name || "—"}
              </p>
            )}
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "rgba(240,237,232,0.4)", display: "block", marginBottom: "6px" }}>
              Bio
            </label>
            {editing ? (
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell people about yourself..."
                style={{
                  width: "100%", background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px",
                  padding: "12px 14px", color: "#F0EDE8", fontSize: "0.9rem",
                  outline: "none", resize: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            ) : (
              <p style={{ margin: 0, fontSize: "0.9rem", color: bio ? "#F0EDE8" : "rgba(240,237,232,0.3)", lineHeight: 1.5 }}>
                {bio || "No bio yet"}
              </p>
            )}
          </div>
        </div>

        {/* Sign out */}
        <button
          onClick={signOut}
          style={{
            width: "100%", background: "rgba(255,80,80,0.1)",
            border: "1px solid rgba(255,80,80,0.2)",
            borderRadius: "12px", padding: "14px",
            color: "#ff6b6b", fontWeight: 600, fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Sign Out
        </button>
      </div>

      <BottomNav active="profile" />
    </div></PageShell>
  );
}

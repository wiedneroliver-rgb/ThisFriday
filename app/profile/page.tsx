"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import BottomNav from "@/components/BottomNav";
import PageShell from "@/components/PageShell";
import PhotoViewer from "@/components/PhotoViewer";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
  username?: string | null;
}

interface GalleryPhoto {
  id: string;
  photo_url: string;
  source_type: string | null;
  source_photo_id: string | null;
}

type ProfileTab = "info" | "gallery";

export default function ProfilePage() {
  const router = useRouter();
  const { userId, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);
  const [tab, setTab] = useState<ProfileTab>("info");
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<GalleryPhoto[] | null>(null);
  const [viewingIndex, setViewingIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (userId) loadProfile(); }, [userId]);

  async function loadProfile() {
    if (!userId) return;
    const supabase = createClient();

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

  async function loadGallery() {
    if (!userId || galleryLoading) return;
    setGalleryLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("user_gallery").select("id,photo_url,source_type,source_photo_id")
      .eq("user_id", userId)
      .order("id", { ascending: false });
    setGallery(data || []);
    setGalleryLoading(false);
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

  async function deleteAccount() {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.rpc("delete_user_account");
    await signOut();
    router.push("/login");
  }

  async function removeFromGallery(photoId: string) {
    const supabase = createClient();
    await supabase.from("user_gallery").delete().eq("id", photoId);
    setGallery((prev) => prev.filter((p) => p.id !== photoId));
  }

  if (!profile) {
    return (
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
        Loading...
      </div>
    );
  }

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
          padding: "16px 16px 0",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <h1 style={{ fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", margin: 0 }}>Profile</h1>
            {tab === "info" && (
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
            )}
          </div>
          {/* Tabs */}
          <div style={{ display: "flex" }}>
            {(["info", "gallery"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  if (t === "gallery") loadGallery();
                }}
                style={{
                  flex: 1, padding: "10px", background: "none", border: "none",
                  color: tab === t ? "#F0EDE8" : "rgba(240,237,232,0.35)",
                  fontWeight: tab === t ? 700 : 400,
                  fontSize: "0.9rem", cursor: "pointer",
                  borderBottom: tab === t ? "2px solid #F0EDE8" : "2px solid transparent",
                  textTransform: "capitalize",
                }}
              >
                {t === "info" ? "Profile" : "Gallery"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 16px", paddingBottom: "80px", maxWidth: "480px", margin: "0 auto" }}>
          {tab === "info" ? (
            <>
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
                {profile.username && (
                  <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.85rem", margin: 0 }}>@{profile.username}</p>
                )}
              </div>

              {/* Stats */}
              <div style={{
                display: "flex", gap: "1px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "14px", overflow: "hidden",
                marginBottom: "24px",
              }}>
                {[{ label: "Friends", value: friendCount }, { label: "Events", value: eventCount }].map((stat) => (
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
                    <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>{profile.display_name || "—"}</p>
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
                  cursor: "pointer", marginBottom: "12px",
                }}
              >
                Sign Out
              </button>

              {/* Delete account */}
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    width: "100%", background: "none",
                    border: "none", padding: "10px",
                    color: "rgba(240,237,232,0.25)", fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Delete Account
                </button>
              ) : (
                <div style={{
                  background: "rgba(255,50,50,0.08)",
                  border: "1px solid rgba(255,50,50,0.2)",
                  borderRadius: "14px", padding: "16px",
                }}>
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: "0 0 6px", color: "#ff6b6b" }}>
                    Delete Account
                  </p>
                  <p style={{ fontSize: "0.8rem", color: "rgba(240,237,232,0.5)", margin: "0 0 12px", lineHeight: 1.4 }}>
                    This is permanent. Type DELETE to confirm.
                  </p>
                  <input
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="Type DELETE"
                    style={{
                      width: "100%", background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
                      padding: "10px 12px", color: "#F0EDE8", fontSize: "0.9rem",
                      outline: "none", boxSizing: "border-box", marginBottom: "10px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={deleteAccount}
                      disabled={deleteText !== "DELETE" || deleting}
                      style={{
                        flex: 1, background: deleteText === "DELETE" ? "#e05a5a" : "rgba(255,255,255,0.06)",
                        border: "none", borderRadius: "10px", padding: "11px",
                        color: deleteText === "DELETE" ? "#fff" : "rgba(240,237,232,0.3)",
                        fontWeight: 700, fontSize: "0.85rem",
                        cursor: deleteText === "DELETE" && !deleting ? "pointer" : "not-allowed",
                      }}
                    >
                      {deleting ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                      style={{
                        flex: 1, background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "10px", padding: "11px",
                        color: "rgba(240,237,232,0.6)", fontSize: "0.85rem", cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            // Gallery tab
            <>
              {galleryLoading ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>Loading...</div>
              ) : gallery.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(240,237,232,0.3)" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>📷</div>
                  <p style={{ fontSize: "1rem" }}>No saved photos yet</p>
                  <p style={{ fontSize: "0.82rem", marginTop: "6px" }}>Save photos from plans and events to see them here</p>
                </div>
              ) : (
                <div style={{
                  display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "2px",
                }}>
                  {gallery.map((photo, i) => (
                    <div
                      key={photo.id}
                      onClick={() => { setViewingPhoto(gallery); setViewingIndex(i); }}
                      style={{ aspectRatio: "1", overflow: "hidden", cursor: "pointer", position: "relative" }}
                    >
                      <img
                        src={photo.photo_url}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Photo viewer for gallery */}
        {viewingPhoto && (
          <PhotoViewer
            photos={viewingPhoto.map((p) => ({ id: p.id, photo_url: p.photo_url, user_id: userId || "" }))}
            initialIndex={viewingIndex}
            currentUserId={userId || ""}
            onClose={() => setViewingPhoto(null)}
            onDelete={(id) => { removeFromGallery(id); }}
          />
        )}

        <BottomNav active="profile" />
      </div>
    </PageShell>
  );
}

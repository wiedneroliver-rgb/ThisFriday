"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import PhotoViewer from "@/components/PhotoViewer";
import type { ScenePhoto } from "@/lib/types";

interface Props {
  sceneId: string;
  currentUserId: string;
  isHost: boolean;
}

export default function ScenePhotos({ sceneId, currentUserId, isHost }: Props) {
  const [photos, setPhotos] = useState<ScenePhoto[]>([]);
  const [folder, setFolder] = useState<"public" | "friends">("public");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadPhotos(); }, [sceneId, folder]);

  async function loadPhotos() {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("scene_photos")
      .select("*")
      .eq("scene_id", sceneId)
      .eq("folder", folder)
      .order("created_at", { ascending: false });
    setPhotos(data || []);
    setLoading(false);
  }

  async function uploadPhotos(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    const supabase = createClient();
    const toInsert: Omit<ScenePhoto, "id" | "created_at">[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) continue;
      const ext = file.name.split(".").pop();
      const path = `scenes/${sceneId}/${currentUserId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("scene-photos")
        .upload(path, file, { upsert: true });
      if (error) continue;
      const { data: urlData } = supabase.storage
        .from("scene-photos")
        .getPublicUrl(path);
      toInsert.push({
        scene_id: sceneId,
        user_id: currentUserId,
        photo_url: urlData.publicUrl,
        folder,
      });
    }

    if (toInsert.length > 0) {
      const { data: inserted } = await supabase
        .from("scene_photos")
        .insert(toInsert)
        .select();
      if (inserted) setPhotos((prev) => [...(inserted as ScenePhoto[]), ...prev]);
    }
    setUploading(false);
  }

  function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setViewerIndex(null);
  }

  const displayPhotos = photos as (ScenePhoto & { id: string; photo_url: string; user_id: string })[];

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Folder tabs */}
      <div style={{
        display: "flex", background: "rgba(255,255,255,0.05)",
        borderRadius: "10px", padding: "3px", marginBottom: "16px",
        border: "1px solid rgba(255,255,255,0.07)",
      }}>
        {(["public", "friends"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFolder(f)}
            style={{
              flex: 1, padding: "8px",
              background: folder === f ? "rgba(255,255,255,0.1)" : "none",
              border: "none", borderRadius: "8px",
              color: folder === f ? "#F0EDE8" : "rgba(240,237,232,0.4)",
              fontWeight: folder === f ? 700 : 500,
              fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            {f === "public" ? "🌐 Public" : "👥 Friends"}
          </button>
        ))}
      </div>

      {/* Upload button */}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{
          width: "100%", padding: "12px",
          background: "rgba(255,255,255,0.05)",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "12px", color: "rgba(240,237,232,0.5)",
          fontSize: "0.875rem", cursor: uploading ? "not-allowed" : "pointer",
          marginBottom: "16px",
        }}
      >
        {uploading ? "Uploading..." : "📷 Add Photos"}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && uploadPhotos(e.target.files)}
        style={{ display: "none" }}
      />

      {/* Photo grid */}
      {loading ? (
        <p style={{ color: "rgba(240,237,232,0.3)", textAlign: "center", padding: "24px 0" }}>Loading...</p>
      ) : photos.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(240,237,232,0.25)" }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "8px" }}>📸</p>
          <p style={{ fontSize: "0.875rem" }}>No photos yet. Be the first!</p>
        </div>
      ) : (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
          gap: "3px",
        }}>
          {photos.map((photo, i) => (
            <div
              key={photo.id}
              onClick={() => setViewerIndex(i)}
              style={{
                aspectRatio: "1", overflow: "hidden",
                cursor: "pointer", borderRadius: "4px",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <img
                src={photo.photo_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          ))}
        </div>
      )}

      {viewerIndex !== null && (
        <PhotoViewer
          photos={displayPhotos}
          initialIndex={viewerIndex}
          currentUserId={currentUserId}
          onClose={() => setViewerIndex(null)}
          onDelete={handleDelete}
          sourceType="scene"
        />
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import ReportModal from "@/components/ReportModal";

interface Photo {
  id: string;
  photo_url: string;
  user_id: string;
}

interface Props {
  photos: Photo[];
  initialIndex: number;
  currentUserId: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
  sourceType?: "scene" | "event";
}

export default function PhotoViewer({
  photos,
  initialIndex,
  currentUserId,
  onClose,
  onDelete,
  sourceType = "scene",
}: Props) {
  const [index, setIndex] = useState(initialIndex);
  const [showReport, setShowReport] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const photo = photos[index];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, photos.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  async function saveToGallery() {
    if (saving || saved) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("user_gallery").insert({
      user_id: currentUserId,
      photo_url: photo.photo_url,
      source_type: sourceType,
      source_photo_id: photo.id,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function deletePhoto() {
    if (!onDelete) return;
    if (!confirm("Delete this photo?")) return;
    const supabase = createClient();
    const table = sourceType === "scene" ? "scene_photos" : "event_photos";
    await supabase.from(table).delete().eq("id", photo.id);
    onDelete(photo.id);
    if (photos.length <= 1) onClose();
    else setIndex((i) => Math.max(0, i - 1));
  }

  if (!photo) return null;

  return (
    <>
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 400,
          background: "rgba(0,0,0,0.97)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            background: "rgba(255,255,255,0.1)", border: "none",
            borderRadius: "50%", width: 36, height: 36,
            color: "#fff", cursor: "pointer", fontSize: "1rem", zIndex: 10,
          }}
        >✕</button>

        {/* Counter */}
        <div style={{
          position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)",
          color: "rgba(255,255,255,0.5)", fontSize: "0.8rem",
        }}>
          {index + 1} / {photos.length}
        </div>

        {/* Prev */}
        {index > 0 && (
          <button
            onClick={() => setIndex(index - 1)}
            style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: "50%", width: 44, height: 44,
              color: "#fff", cursor: "pointer", fontSize: "1.2rem",
            }}
          >‹</button>
        )}

        {/* Image */}
        <img
          src={photo.photo_url}
          alt=""
          style={{
            maxWidth: "92vw", maxHeight: "80vh",
            objectFit: "contain", borderRadius: "8px",
          }}
        />

        {/* Next */}
        {index < photos.length - 1 && (
          <button
            onClick={() => setIndex(index + 1)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "rgba(255,255,255,0.1)", border: "none",
              borderRadius: "50%", width: 44, height: 44,
              color: "#fff", cursor: "pointer", fontSize: "1.2rem",
            }}
          >›</button>
        )}

        {/* Bottom actions */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          display: "flex", gap: "10px",
        }}>
          <button
            onClick={saveToGallery}
            style={{
              background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "20px", padding: "8px 16px",
              color: saved ? "#4caf50" : "#fff", fontSize: "0.82rem", cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "⬇ Save"}
          </button>
          {photo.user_id !== currentUserId && (
            <button
              onClick={() => setShowReport(true)}
              style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "20px", padding: "8px 16px",
                color: "rgba(255,255,255,0.6)", fontSize: "0.82rem", cursor: "pointer",
              }}
            >
              🚩 Report
            </button>
          )}
          {photo.user_id === currentUserId && onDelete && (
            <button
              onClick={deletePhoto}
              style={{
                background: "rgba(224,90,90,0.15)", border: "1px solid rgba(224,90,90,0.2)",
                borderRadius: "20px", padding: "8px 16px",
                color: "#e05a5a", fontSize: "0.82rem", cursor: "pointer",
              }}
            >
              🗑 Delete
            </button>
          )}
        </div>
      </div>

      {showReport && (
        <ReportModal
          type="photo"
          targetId={photo.id}
          reporterId={currentUserId}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}

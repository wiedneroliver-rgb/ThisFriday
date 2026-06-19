"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

type ReportType = "user" | "scene" | "event" | "photo" | "comment";

interface Props {
  type: ReportType;
  targetId: string | number;
  reporterId: string;
  onClose: () => void;
}

const REASONS = [
  "Spam or misleading",
  "Inappropriate content",
  "Harassment or bullying",
  "Violence or dangerous",
  "Underage content",
  "Other",
];

const TABLE_MAP: Record<ReportType, string> = {
  user: "reports",
  scene: "scene_reports",
  event: "event_reports",
  photo: "photo_reports",
  comment: "comment_reports",
};

const ID_COL_MAP: Record<ReportType, string> = {
  user: "reported_id",
  scene: "scene_id",
  event: "event_id",
  photo: "photo_id",
  comment: "comment_id",
};

const REPORTER_COL_MAP: Record<ReportType, string> = {
  user: "user_id",
  scene: "reporter_id",
  event: "reporter_id",
  photo: "reporter_id",
  comment: "reporter_id",
};

export default function ReportModal({ type, targetId, reporterId, onClose }: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!reason || loading) return;
    setLoading(true);
    const supabase = createClient();
    const table = TABLE_MAP[type];
    const idCol = ID_COL_MAP[type];
    const reporterCol = REPORTER_COL_MAP[type];

    await supabase.from(table).insert({
      [idCol]: targetId,
      [reporterCol]: reporterId,
      reason,
    });

    setDone(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#141414", borderRadius: "20px 20px 0 0",
        width: "100%", padding: "20px",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "10px" }}>✓</div>
            <p style={{ color: "#F0EDE8", fontWeight: 700 }}>Reported. Thank you.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>Report</h3>
              <button onClick={onClose} style={{
                background: "rgba(255,255,255,0.07)", border: "none",
                borderRadius: "50%", width: 30, height: 30,
                color: "#F0EDE8", cursor: "pointer",
              }}>✕</button>
            </div>

            <p style={{ color: "rgba(240,237,232,0.5)", fontSize: "0.85rem", marginBottom: "16px" }}>
              Why are you reporting this?
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  style={{
                    padding: "12px 16px", borderRadius: "10px", textAlign: "left",
                    background: reason === r ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                    border: reason === r ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.07)",
                    color: reason === r ? "#F0EDE8" : "rgba(240,237,232,0.6)",
                    fontSize: "0.9rem", cursor: "pointer", fontWeight: reason === r ? 600 : 400,
                  }}
                >
                  {r}
                </button>
              ))}
            </div>

            <button
              onClick={submit}
              disabled={!reason || loading}
              style={{
                width: "100%", background: reason ? "#e05a5a" : "rgba(224,90,90,0.3)",
                border: "none", borderRadius: "12px", padding: "14px",
                color: "#fff", fontWeight: 800, fontSize: "0.95rem",
                cursor: !reason || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Submitting..." : "Submit Report"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

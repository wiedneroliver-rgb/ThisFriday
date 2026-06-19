"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import FlareSelector from "@/components/FlareSelector";
import type { HostedEvent, PlanVisibility } from "@/lib/types";
import { VISIBILITY_OPTIONS } from "@/lib/types";

interface Props {
  event: HostedEvent;
  onClose: () => void;
  onSaved: (updated: HostedEvent) => void;
}

export default function EditPlanModal({ event, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [flare, setFlare] = useState<string | null>(event.flare);
  const [visibility, setVisibility] = useState<PlanVisibility>(
    (event.visibility as PlanVisibility) || "semi_public"
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("hosted_events")
      .update({ title: title.trim(), description: description.trim() || null, flare, visibility })
      .eq("id", event.id)
      .select()
      .single();
    setSaving(false);
    if (data) onSaved(data as HostedEvent);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#141414", borderRadius: "20px 20px 0 0",
        width: "100%", maxHeight: "90vh", overflowY: "auto",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <h3 style={{ fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>Edit Plan</h3>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "8px",
              padding: "7px 12px", color: "rgba(240,237,232,0.5)", cursor: "pointer", fontSize: "0.85rem",
            }}>Cancel</button>
            <button
              onClick={save}
              disabled={!title.trim() || saving}
              style={{
                background: "#F0EDE8", border: "none", borderRadius: "8px",
                padding: "7px 14px", color: "#080808", fontWeight: 700,
                cursor: title.trim() ? "pointer" : "not-allowed", fontSize: "0.85rem",
                opacity: saving ? 0.6 : 1,
              }}
            >{saving ? "Saving..." : "Save"}</button>
          </div>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", paddingBottom: "40px" }}>
          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "8px" }}>
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                padding: "12px 14px", color: "#F0EDE8", fontSize: "0.95rem",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "8px" }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                padding: "12px 14px", color: "#F0EDE8", fontSize: "0.9rem",
                outline: "none", resize: "none", boxSizing: "border-box",
                lineHeight: 1.5, fontFamily: "inherit",
              }}
            />
          </div>

          {/* Flare */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "8px" }}>
              Flare
            </label>
            <FlareSelector selected={flare} onChange={setFlare} />
          </div>

          {/* Visibility */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(240,237,232,0.35)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "8px" }}>
              Visibility
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setVisibility(opt.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: "12px",
                    padding: "12px 14px", borderRadius: "10px", textAlign: "left",
                    background: visibility === opt.value ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${visibility === opt.value ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)"}`,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{opt.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.875rem", color: "#F0EDE8" }}>{opt.label}</p>
                    <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(240,237,232,0.4)" }}>{opt.subtitle}</p>
                  </div>
                  {visibility === opt.value && (
                    <span style={{ marginLeft: "auto", color: "#F0EDE8", fontSize: "0.8rem" }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

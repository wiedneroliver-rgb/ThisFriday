"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";

interface Props {
  eventId: number;
  currentUserId: string;
  displayName: string;
  cap?: number | null;
  onClose: () => void;
}

export default function GuestListSignup({ eventId, currentUserId, displayName, cap, onClose }: Props) {
  const [name, setName] = useState(displayName);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !phone.trim()) { setError("Name and phone are required"); return; }
    setSubmitting(true);
    setError("");
    const supabase = createClient();

    // Check capacity
    if (cap) {
      const { count } = await supabase
        .from("guest_list")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId);
      if (count !== null && count >= cap) {
        setError("Guest list is full");
        setSubmitting(false);
        return;
      }
    }

    // Check if already signed up
    const { data: existing } = await supabase
      .from("guest_list")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    if (existing) {
      setError("You're already on the guest list");
      setSubmitting(false);
      return;
    }

    const { error: insertErr } = await supabase.from("guest_list").insert({
      event_id: eventId,
      user_id: currentUserId,
      display_name: name.trim(),
      phone_number: phone.trim(),
    });

    if (insertErr) {
      setError("Failed to sign up. Please try again.");
      setSubmitting(false);
      return;
    }

    setDone(true);
    setTimeout(onClose, 2000);
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
        width: "100%", padding: "20px 24px",
        paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>✅</div>
            <h3 style={{ fontWeight: 800, fontSize: "1.2rem" }}>You&apos;re on the list!</h3>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>Join Guest List</h3>
              <button onClick={onClose} style={{
                background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%",
                width: 30, height: 30, color: "#F0EDE8", cursor: "pointer",
              }}>✕</button>
            </div>

            {error && (
              <div style={{
                background: "rgba(224,90,90,0.12)", border: "1px solid rgba(224,90,90,0.25)",
                borderRadius: "10px", padding: "10px 14px", marginBottom: "16px",
                color: "#e05a5a", fontSize: "0.85rem",
              }}>{error}</div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(240,237,232,0.4)", marginBottom: "6px" }}>
                  Full Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                    padding: "12px 14px", color: "#F0EDE8", fontSize: "0.9rem",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(240,237,232,0.4)", marginBottom: "6px" }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (000) 000-0000"
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px",
                    padding: "12px 14px", color: "#F0EDE8", fontSize: "0.9rem",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              style={{
                width: "100%", background: "#F0EDE8", color: "#080808",
                border: "none", borderRadius: "12px", padding: "14px",
                fontWeight: 800, fontSize: "0.95rem",
                cursor: submitting ? "not-allowed" : "pointer",
                opacity: submitting ? 0.6 : 1,
              }}
            >
              {submitting ? "Signing up..." : "Join Guest List"}
            </button>

            {cap && (
              <p style={{ textAlign: "center", fontSize: "0.75rem", color: "rgba(240,237,232,0.3)", margin: "10px 0 0" }}>
                Capacity limited to {cap} guests
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

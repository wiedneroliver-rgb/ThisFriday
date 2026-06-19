"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import PageShell from "@/components/PageShell";
import FlareSelector from "@/components/FlareSelector";
import VenuePicker from "@/components/VenuePicker";
import InviteFriendsModal from "@/components/InviteFriendsModal";
import { getSelectedCity } from "@/components/CityPicker";
import { toDateInputValue, getNextFriday, formatTime } from "@/lib/utils";
import { VISIBILITY_OPTIONS } from "@/lib/types";
import type { PlanVisibility } from "@/lib/types";

interface VenueStop { id: number; name: string; }

function CreatePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userId } = useAuth();

  // Pre-fill from query params (from "Make a Plan" on event/venue pages)
  const prefillVenueId = searchParams.get("venueId");
  const prefillVenueName = searchParams.get("venueName");

  const initialVenues: VenueStop[] = prefillVenueId && prefillVenueName
    ? [{ id: Number(prefillVenueId), name: prefillVenueName }]
    : [];

  // Form state
  const [title, setTitle] = useState("");
  const [flare, setFlare] = useState<string | null>(null);
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [startTime, setStartTime] = useState("21:00");
  const [endTime, setEndTime] = useState("02:00");
  const [whereMode, setWhereMode] = useState<"venue" | "address">(
    initialVenues.length > 0 ? "venue" : "venue"
  );
  const [venues, setVenues] = useState<VenueStop[]>(initialVenues);
  const [address, setAddress] = useState("");
  const [visibility, setVisibility] = useState<PlanVisibility>("semi_public");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [plusOnes, setPlusOnes] = useState(1);
  const [invitedIds, setInvitedIds] = useState<string[]>([]);

  const [showVenuePicker, setShowVenuePicker] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function buildLocation(): string {
    if (whereMode === "address") return address.trim();
    if (venues.length === 0) return "";
    return venues.map((v) => v.name).join(" → ");
  }

  async function submit() {
    if (!userId) return;
    if (!title.trim()) { setError("Title is required"); return; }
    const location = buildLocation();
    if (!location) { setError("Please add a venue or address"); return; }

    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const city = getSelectedCity();

    // Upload cover photo
    let photoUrl: string | null = null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `covers/${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("scene-photos")
        .upload(path, photoFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("scene-photos")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    // Combine date + start time for the date field
    const eventDatetime = `${date}T${startTime}:00`;

    // Insert hosted_event
    const { data: eventData, error: insertErr } = await supabase
      .from("hosted_events")
      .insert({
        host_id: userId,
        title: title.trim(),
        location,
        date: eventDatetime,
        end_time: endTime,
        flare: flare || null,
        photo_url: photoUrl,
        description: description.trim() || null,
        visibility,
        city,
        default_plus_ones: plusOnes,
        queue_mode: "suggest",
      })
      .select()
      .single();

    if (insertErr || !eventData) {
      setError("Failed to create plan. Please try again.");
      setSubmitting(false);
      return;
    }

    const eventId = eventData.id;

    // Insert invited guests
    if (invitedIds.length > 0) {
      const guestRows = invitedIds.map((uid) => ({
        hosted_event_id: eventId,
        user_id: uid,
        status: "invited",
        invited_by: userId,
        invite_allowance: plusOnes,
      }));
      await supabase.from("hosted_event_guests").insert(guestRows);

      // Send notifications
      const notifRows = invitedIds.map((uid) => ({
        user_id: uid,
        actor_id: userId,
        type: "scene_invite",
        message: `invited you to a plan`,
        scene_id: eventId,
        read: false,
      }));
      await supabase.from("notifications").insert(notifRows);
    }

    router.push(`/events/${eventId}`);
  }

  const sectionStyle = {
    marginBottom: "28px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "0.78rem", fontWeight: 700,
    color: "rgba(240,237,232,0.4)", letterSpacing: "0.08em",
    textTransform: "uppercase" as const, marginBottom: "10px",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
    padding: "14px 16px", color: "#F0EDE8", fontSize: "0.95rem",
    outline: "none", boxSizing: "border-box" as const,
  };

  return (
    <PageShell>
      <div style={{ background: "#080808", minHeight: "100vh", color: "#F0EDE8" }}>
        {/* Header */}
        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "rgba(8,8,8,0.97)", backdropFilter: "blur(12px)",
          padding: "52px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <button onClick={() => router.back()} style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "rgba(255,255,255,0.07)", border: "none",
            color: "#F0EDE8", cursor: "pointer", fontSize: "1rem",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>‹</button>
          <h1 style={{ fontWeight: 800, fontSize: "1.3rem", letterSpacing: "-0.02em", margin: 0, flex: 1 }}>
            Create Plan
          </h1>
          <button
            onClick={submit}
            disabled={submitting}
            style={{
              background: "#F0EDE8", color: "#080808",
              border: "none", borderRadius: "20px", padding: "8px 18px",
              fontWeight: 800, fontSize: "0.85rem",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>

        <div style={{ padding: "24px 20px 120px" }}>
          {error && (
            <div style={{
              background: "rgba(224,90,90,0.15)", border: "1px solid rgba(224,90,90,0.3)",
              borderRadius: "10px", padding: "12px 16px", marginBottom: "20px",
              color: "#e05a5a", fontSize: "0.875rem",
            }}>
              {error}
            </div>
          )}

          {/* Cover Photo */}
          <div style={sectionStyle}>
            <input
              ref={photoRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: "none" }}
            />
            <div
              onClick={() => photoRef.current?.click()}
              style={{
                width: "100%", aspectRatio: "16/9",
                background: photoPreview ? "none" : "rgba(255,255,255,0.04)",
                border: `2px dashed ${photoPreview ? "transparent" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "16px", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", position: "relative",
              }}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "rgba(0,0,0,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ background: "rgba(0,0,0,0.5)", borderRadius: "8px", padding: "6px 12px", fontSize: "0.8rem" }}>
                      Change photo
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "rgba(240,237,232,0.3)" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "6px" }}>📷</div>
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>Add cover photo</p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 60))}
              placeholder="What's the plan?"
              style={inputStyle}
            />
            <p style={{ color: "rgba(240,237,232,0.25)", fontSize: "0.72rem", margin: "4px 0 0 4px" }}>
              {title.length}/60
            </p>
          </div>

          {/* Flare */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Flare</label>
            <FlareSelector selected={flare} onChange={setFlare} />
          </div>

          {/* Date & Time */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Date & Time</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: "0.72rem", color: "rgba(240,237,232,0.35)" }}>Date</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ ...inputStyle, padding: "10px 12px", fontSize: "0.85rem", colorScheme: "dark" }}
                />
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: "0.72rem", color: "rgba(240,237,232,0.35)" }}>Start</p>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{ ...inputStyle, padding: "10px 12px", fontSize: "0.85rem", colorScheme: "dark" }}
                />
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: "0.72rem", color: "rgba(240,237,232,0.35)" }}>End</p>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{ ...inputStyle, padding: "10px 12px", fontSize: "0.85rem", colorScheme: "dark" }}
                />
              </div>
            </div>
          </div>

          {/* Where */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Where</label>
            {/* Mode toggle */}
            <div style={{
              display: "flex", background: "rgba(255,255,255,0.05)",
              borderRadius: "10px", padding: "3px", marginBottom: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              {(["venue", "address"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setWhereMode(mode)}
                  style={{
                    flex: 1, padding: "8px",
                    background: whereMode === mode ? "rgba(255,255,255,0.12)" : "none",
                    border: "none", borderRadius: "8px",
                    color: whereMode === mode ? "#F0EDE8" : "rgba(240,237,232,0.4)",
                    fontWeight: whereMode === mode ? 700 : 500,
                    fontSize: "0.85rem", cursor: "pointer",
                  }}
                >
                  {mode === "venue" ? "🏛 Venue" : "📍 Address"}
                </button>
              ))}
            </div>

            {whereMode === "venue" ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowVenuePicker(true)}
                  style={{
                    width: "100%", padding: "14px 16px",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px", color: venues.length > 0 ? "#F0EDE8" : "rgba(240,237,232,0.35)",
                    fontSize: "0.9rem", cursor: "pointer", textAlign: "left",
                  }}
                >
                  {venues.length > 0
                    ? venues.map((v) => v.name).join(" → ")
                    : "Search venues..."}
                </button>
                {venues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setVenues([])}
                    style={{
                      background: "none", border: "none",
                      color: "rgba(240,237,232,0.35)", fontSize: "0.75rem",
                      cursor: "pointer", marginTop: "6px",
                    }}
                  >
                    Clear venues
                  </button>
                )}
              </>
            ) : (
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter address or location..."
                style={inputStyle}
              />
            )}
          </div>

          {/* Visibility */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Who can see this</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    padding: "14px 16px", borderRadius: "12px",
                    background: visibility === opt.value ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${visibility === opt.value ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: "1.3rem" }}>{opt.icon}</span>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem", color: "#F0EDE8" }}>{opt.label}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(240,237,232,0.4)" }}>{opt.subtitle}</p>
                  </div>
                  <div style={{ marginLeft: "auto" }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      border: visibility === opt.value ? "none" : "2px solid rgba(255,255,255,0.2)",
                      background: visibility === opt.value ? "#F0EDE8" : "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#080808", fontSize: "0.7rem", fontWeight: 800,
                    }}>
                      {visibility === opt.value && "✓"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should guests know?"
              rows={3}
              style={{
                ...inputStyle, resize: "none", lineHeight: 1.6,
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Plus-ones */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Plus-Ones per Guest</label>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <button
                type="button"
                onClick={() => setPlusOnes(Math.max(0, plusOnes - 1))}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#F0EDE8", fontSize: "1.2rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >−</button>
              <span style={{ fontWeight: 700, fontSize: "1.1rem", minWidth: "24px", textAlign: "center" }}>
                {plusOnes}
              </span>
              <button
                type="button"
                onClick={() => setPlusOnes(Math.min(5, plusOnes + 1))}
                style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#F0EDE8", fontSize: "1.2rem", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >+</button>
              <span style={{ color: "rgba(240,237,232,0.35)", fontSize: "0.82rem" }}>
                Each guest can invite {plusOnes} {plusOnes === 1 ? "friend" : "friends"}
              </span>
            </div>
          </div>

          {/* Invite Friends */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Invite Friends</label>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                width: "100%", padding: "14px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px dashed rgba(255,255,255,0.15)",
                borderRadius: "12px", color: "rgba(240,237,232,0.5)",
                fontSize: "0.9rem", cursor: "pointer", textAlign: "left",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>👥</span>
              {invitedIds.length > 0
                ? `${invitedIds.length} friend${invitedIds.length !== 1 ? "s" : ""} invited`
                : "Invite friends..."}
            </button>
          </div>

          {/* Next Friday shortcut */}
          <button
            type="button"
            onClick={() => setDate(toDateInputValue(getNextFriday()))}
            style={{
              background: "none", border: "none",
              color: "rgba(240,237,232,0.35)", fontSize: "0.8rem",
              cursor: "pointer", textDecoration: "underline",
              marginBottom: "16px",
            }}
          >
            Set to next Friday
          </button>
        </div>

        {/* Modals */}
        {showVenuePicker && (
          <VenuePicker
            selected={venues}
            onChange={setVenues}
            onClose={() => setShowVenuePicker(false)}
          />
        )}
        {showInviteModal && userId && (
          <InviteFriendsModal
            userId={userId}
            selected={invitedIds}
            onChange={setInvitedIds}
            onClose={() => setShowInviteModal(false)}
          />
        )}
      </div>
    </PageShell>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreatePageInner />
    </Suspense>
  );
}

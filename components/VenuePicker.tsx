"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { getSelectedCity } from "@/components/CityPicker";
import type { Venue } from "@/lib/types";

interface SelectedVenue {
  id: number;
  name: string;
}

interface Props {
  selected: SelectedVenue[];
  onChange: (venues: SelectedVenue[]) => void;
  maxStops?: number;
  onClose: () => void;
}

export default function VenuePicker({ selected, onChange, maxStops = 5, onClose }: Props) {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    loadVenues();
  }, []);

  async function loadVenues() {
    const supabase = createClient();
    const city = getSelectedCity();
    const { data } = await supabase
      .from("venues")
      .select("id,name,normalized_name,city,image_url")
      .eq("city", city)
      .order("name");
    setVenues(data || []);
    setLoading(false);
  }

  function toggle(venue: Venue) {
    const exists = selected.find((v) => v.id === venue.id);
    if (exists) {
      onChange(selected.filter((v) => v.id !== venue.id));
    } else {
      if (selected.length >= maxStops) return;
      onChange([...selected, { id: venue.id, name: venue.name }]);
    }
  }

  const filtered = search.trim()
    ? venues.filter((v) =>
        v.name.toLowerCase().includes(search.toLowerCase())
      )
    : venues;

  return (
    <div style={{
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
            <h3 style={{ fontWeight: 800, fontSize: "1.1rem", margin: 0 }}>Pick Venue</h3>
            <button onClick={onClose} style={{
              background: "rgba(255,255,255,0.07)", border: "none", borderRadius: "50%",
              width: 30, height: 30, color: "#F0EDE8", cursor: "pointer", fontSize: "0.9rem",
            }}>✕</button>
          </div>
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search venues..."
            style={{
              width: "100%", background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
              padding: "10px 14px", color: "#F0EDE8", fontSize: "0.9rem",
              outline: "none", boxSizing: "border-box",
            }}
          />
          {selected.length > 0 && (
            <p style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.75rem", margin: "8px 0 0" }}>
              {selected.length} selected · stops: {selected.map((v) => v.name).join(" → ")}
            </p>
          )}
        </div>

        {/* Venue list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {loading ? (
            <p style={{ padding: "24px", color: "rgba(240,237,232,0.3)", textAlign: "center" }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: "24px", color: "rgba(240,237,232,0.3)", textAlign: "center" }}>No venues found</p>
          ) : (
            filtered.map((venue) => {
              const isSelected = !!selected.find((v) => v.id === venue.id);
              const isDisabled = !isSelected && selected.length >= maxStops;
              return (
                <button
                  key={venue.id}
                  onClick={() => !isDisabled && toggle(venue)}
                  style={{
                    display: "flex", alignItems: "center", gap: "14px",
                    width: "100%", padding: "12px 20px",
                    background: isSelected ? "rgba(240,237,232,0.06)" : "none",
                    border: "none", cursor: isDisabled ? "not-allowed" : "pointer",
                    color: "#F0EDE8", opacity: isDisabled ? 0.4 : 1,
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    textAlign: "left",
                  }}
                >
                  {/* Venue image */}
                  <div style={{
                    width: 44, height: 44, borderRadius: "10px",
                    background: "rgba(255,255,255,0.07)", overflow: "hidden", flexShrink: 0,
                  }}>
                    {venue.image_url && (
                      <img src={venue.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>{venue.name}</p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(240,237,232,0.4)" }}>{venue.city}</p>
                  </div>
                  {isSelected && (
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: "#F0EDE8", display: "flex", alignItems: "center",
                      justifyContent: "center", color: "#080808", fontSize: "0.75rem",
                      fontWeight: 800, flexShrink: 0,
                    }}>
                      {selected.findIndex((v) => v.id === venue.id) + 1}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Done button */}
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
            Done {selected.length > 0 ? `(${selected.length})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

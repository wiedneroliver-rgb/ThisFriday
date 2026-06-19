"use client";

import { useState, useEffect, useRef } from "react";
import { CANADIAN_CITIES } from "@/lib/types";

const CITY_KEY = "selectedCity";

export function getSelectedCity(): string {
  if (typeof window === "undefined") return "Victoria";
  return localStorage.getItem(CITY_KEY) || "Victoria";
}

export function setSelectedCity(city: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(CITY_KEY, city);
    window.dispatchEvent(new CustomEvent("cityChanged", { detail: city }));
  }
}

export default function CityPicker() {
  const [city, setCity] = useState("Victoria");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCity(getSelectedCity());
    const handler = (e: Event) => {
      setCity((e as CustomEvent).detail as string);
    };
    window.addEventListener("cityChanged", handler);
    return () => window.removeEventListener("cityChanged", handler);
  }, []);

  // Auto-detect city via geolocation on first load if not set
  useEffect(() => {
    if (localStorage.getItem(CITY_KEY)) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await resp.json();
          const detected =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.village ||
            "";
          const matched = CANADIAN_CITIES.find(
            (c) => c.toLowerCase() === detected.toLowerCase()
          );
          if (matched) setSelectedCity(matched);
        } catch {
          // silently fail
        }
      },
      () => {} // silently fail if denied
    );
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function select(c: string) {
    setSelectedCity(c);
    setCity(c);
    setOpen(false);
    setSearch("");
  }

  const filtered = search.trim()
    ? CANADIAN_CITIES.filter((c) =>
        c.toLowerCase().includes(search.toLowerCase())
      )
    : CANADIAN_CITIES;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "5px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "20px", padding: "5px 10px 5px 8px",
          color: "#F0EDE8", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
        }}
      >
        <span style={{ fontSize: "0.85rem" }}>📍</span>
        {city}
        <span style={{ fontSize: "0.6rem", color: "rgba(240,237,232,0.4)", marginLeft: "1px" }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "12px", overflow: "hidden",
          width: "180px", zIndex: 100,
          boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search city..."
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                padding: "6px 10px", color: "#F0EDE8", fontSize: "0.8rem",
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          {/* City list */}
          <div style={{ maxHeight: "240px", overflowY: "auto" }}>
            {filtered.map((c, i) => (
              <button
                key={c}
                onClick={() => select(c)}
                style={{
                  display: "block", width: "100%", textAlign: "left",
                  padding: "10px 16px", background: "none",
                  border: "none", color: c === city ? "#F0EDE8" : "rgba(240,237,232,0.5)",
                  fontSize: "0.875rem", fontWeight: c === city ? 700 : 400,
                  cursor: "pointer",
                  borderBottom: i !== filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}
              >
                {c === city && <span style={{ marginRight: "6px" }}>✓</span>}{c}
              </button>
            ))}
            {filtered.length === 0 && (
              <p style={{ padding: "16px", color: "rgba(240,237,232,0.3)", fontSize: "0.8rem", margin: 0 }}>
                No cities found
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

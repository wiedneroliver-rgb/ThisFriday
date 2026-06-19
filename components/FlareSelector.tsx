"use client";

import { useState } from "react";
import { FLARE_PRESETS } from "@/lib/types";

interface Props {
  selected: string | null;
  onChange: (key: string | null) => void;
}

export default function FlareSelector({ selected, onChange }: Props) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");

  function selectPreset(key: string) {
    setCustomMode(false);
    onChange(selected === key ? null : key);
  }

  function handleCustom() {
    setCustomMode(true);
    onChange(null);
  }

  function submitCustom() {
    if (customText.trim()) {
      onChange(customText.trim());
    }
  }

  return (
    <div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px",
      }}>
        {FLARE_PRESETS.map((f) => {
          const active = selected === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => selectPreset(f.key)}
              style={{
                display: "flex", alignItems: "center", gap: "5px",
                padding: "7px 12px", borderRadius: "20px",
                background: active ? f.color + "33" : "rgba(255,255,255,0.05)",
                border: active ? `1.5px solid ${f.color}66` : "1.5px solid rgba(255,255,255,0.08)",
                color: active ? f.color : "rgba(240,237,232,0.6)",
                fontSize: "0.82rem", fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "0.9rem" }}>{f.icon}</span>
              {f.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={handleCustom}
          style={{
            display: "flex", alignItems: "center", gap: "5px",
            padding: "7px 12px", borderRadius: "20px",
            background: customMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
            border: `1.5px solid ${customMode ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"}`,
            color: customMode ? "#F0EDE8" : "rgba(240,237,232,0.5)",
            fontSize: "0.82rem", cursor: "pointer",
          }}
        >
          ✏️ Custom
        </button>
      </div>

      {customMode && (
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitCustom(); }}
            placeholder="Name your vibe..."
            maxLength={30}
            style={{
              flex: 1, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "10px", padding: "10px 14px",
              color: "#F0EDE8", fontSize: "0.9rem", outline: "none",
            }}
          />
          <button
            type="button"
            onClick={submitCustom}
            style={{
              background: "#F0EDE8", color: "#080808",
              border: "none", borderRadius: "10px",
              padding: "10px 16px", fontWeight: 700,
              fontSize: "0.85rem", cursor: "pointer",
            }}
          >
            Set
          </button>
        </div>
      )}

      {selected && !FLARE_PRESETS.find((f) => f.key === selected) && (
        <div style={{ marginTop: "8px" }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "20px",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: "0.82rem", color: "#F0EDE8",
          }}>
            ✦ {selected}
            <button
              type="button"
              onClick={() => { onChange(null); setCustomMode(false); setCustomText(""); }}
              style={{
                background: "none", border: "none", color: "rgba(240,237,232,0.4)",
                cursor: "pointer", padding: "0 0 0 4px", fontSize: "0.9rem",
              }}
            >×</button>
          </span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo } from "react";
import { toDateInputValue, getNextFriday } from "@/lib/utils";

interface Props {
  selected: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function DateSelector({ selected, onChange }: Props) {
  const options = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const friday = getNextFriday();

    return [
      { label: "Today", value: toDateInputValue(today) },
      { label: "Tomorrow", value: toDateInputValue(tomorrow) },
      { label: "This Friday", value: toDateInputValue(friday) },
    ];
  }, []);

  return (
    <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "4px 0" }}>
      {options.map((opt) => {
        const active = selected === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              flexShrink: 0, padding: "7px 14px", borderRadius: "20px",
              background: active ? "#F0EDE8" : "rgba(255,255,255,0.07)",
              border: active ? "none" : "1px solid rgba(255,255,255,0.1)",
              color: active ? "#080808" : "rgba(240,237,232,0.6)",
              fontWeight: active ? 700 : 500,
              fontSize: "0.82rem", cursor: "pointer",
            }}
          >
            {opt.label}
          </button>
        );
      })}
      {/* Custom date picker */}
      <label style={{
        flexShrink: 0, display: "flex", alignItems: "center",
        padding: "7px 14px", borderRadius: "20px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(240,237,232,0.5)", fontSize: "0.82rem", cursor: "pointer",
      }}>
        📅 Pick date
        <input
          type="date"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
      </label>
    </div>
  );
}

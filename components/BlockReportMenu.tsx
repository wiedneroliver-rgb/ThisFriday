"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import ReportModal from "@/components/ReportModal";

interface Props {
  targetUserId: string;
  currentUserId: string;
  isBlocked?: boolean;
  onBlock?: () => void;
  children?: React.ReactNode; // trigger element
}

export default function BlockReportMenu({
  targetUserId,
  currentUserId,
  isBlocked = false,
  onBlock,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  async function toggleBlock() {
    setBlocking(true);
    const supabase = createClient();
    if (isBlocked) {
      await supabase.from("blocked_users")
        .delete()
        .eq("user_id", currentUserId)
        .eq("blocked_id", targetUserId);
    } else {
      await supabase.from("blocked_users").insert({
        user_id: currentUserId,
        blocked_id: targetUserId,
      });
    }
    setBlocking(false);
    setOpen(false);
    onBlock?.();
  }

  return (
    <>
      <div ref={ref} style={{ position: "relative" }}>
        <div onClick={() => setOpen((o) => !o)} style={{ cursor: "pointer" }}>
          {children || (
            <button style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "50%", width: 34, height: 34,
              color: "#F0EDE8", cursor: "pointer", fontSize: "1rem",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              ···
            </button>
          )}
        </div>

        {open && (
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)",
            background: "#1e1e1e",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", overflow: "hidden",
            zIndex: 50, minWidth: "160px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}>
            <button
              onClick={() => { setOpen(false); setShowReport(true); }}
              style={{
                display: "block", width: "100%", padding: "12px 16px",
                background: "none", border: "none", textAlign: "left",
                color: "rgba(240,237,232,0.7)", fontSize: "0.875rem",
                cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              🚩 Report
            </button>
            <button
              onClick={toggleBlock}
              disabled={blocking}
              style={{
                display: "block", width: "100%", padding: "12px 16px",
                background: "none", border: "none", textAlign: "left",
                color: isBlocked ? "#4caf50" : "#e05a5a",
                fontSize: "0.875rem", cursor: blocking ? "not-allowed" : "pointer",
              }}
            >
              {blocking ? "..." : isBlocked ? "✓ Unblock" : "🚫 Block"}
            </button>
          </div>
        )}
      </div>

      {showReport && (
        <ReportModal
          type="user"
          targetId={targetUserId}
          reporterId={currentUserId}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}

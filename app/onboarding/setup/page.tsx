"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { getInitials } from "@/lib/utils";

export default function ProfileSetupPage() {
  const router = useRouter();
  const { userId, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const usernameRegex = /^[a-z0-9._]{3,20}$/;

  async function checkUsername(val: string) {
    if (!usernameRegex.test(val)) {
      setUsernameError("3–20 chars, letters/numbers/dots/underscores only");
      return;
    }
    setCheckingUsername(true);
    setUsernameError("");
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", val)
      .neq("id", userId)
      .maybeSingle();
    if (data) {
      setUsernameError("Username is already taken");
    } else {
      setUsernameError("");
    }
    setCheckingUsername(false);
  }

  function handleUsernameChange(val: string) {
    const clean = val.toLowerCase().replace(/[^a-z0-9._]/g, "");
    setUsername(clean);
    if (clean.length >= 3) checkUsername(clean);
    else setUsernameError("");
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    setAvatarFile(file);
    setAvatarUrl(URL.createObjectURL(file));
  }

  async function save() {
    if (!userId || loading) return;
    if (!displayName.trim()) { alert("Please enter your name"); return; }
    if (!usernameRegex.test(username)) { alert("Please enter a valid username"); return; }
    if (usernameError) { alert("Please fix the username error"); return; }

    setLoading(true);
    const supabase = createClient();

    let finalAvatarUrl: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });
      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        finalAvatarUrl = urlData.publicUrl;
      }
    }

    await supabase.from("profiles").upsert({
      id: userId,
      display_name: displayName.trim(),
      username: username.trim(),
      ...(finalAvatarUrl ? { avatar_url: finalAvatarUrl } : {}),
    });

    await refreshProfile();
    router.push("/feed");
  }

  const canSave =
    displayName.trim().length >= 1 &&
    usernameRegex.test(username) &&
    !usernameError &&
    !checkingUsername;

  return (
    <div style={{
      background: "#080808", minHeight: "100vh", color: "#F0EDE8",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "56px 24px 40px",
    }}>
      <div style={{ maxWidth: "400px", width: "100%" }}>
        <h1 style={{
          fontWeight: 900, fontSize: "2rem", letterSpacing: "-0.03em",
          marginBottom: "8px", textAlign: "center",
        }}>
          Set up your profile
        </h1>
        <p style={{
          color: "rgba(240,237,232,0.4)", fontSize: "0.9rem",
          textAlign: "center", marginBottom: "40px", lineHeight: 1.5,
        }}>
          Let your friends find you on ThisFriday
        </p>

        {/* Avatar picker */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 96, height: 96, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "2px dashed rgba(255,255,255,0.2)",
              overflow: "hidden", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative",
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "2rem", color: "rgba(240,237,232,0.3)" }}>
                {displayName ? getInitials(displayName) : "📷"}
              </span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              marginTop: "10px", background: "none", border: "none",
              color: "rgba(240,237,232,0.5)", fontSize: "0.82rem",
              cursor: "pointer",
            }}
          >
            {avatarUrl ? "Change photo" : "Add photo"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
        </div>

        {/* Display name */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            display: "block", fontSize: "0.78rem", fontWeight: 700,
            color: "rgba(240,237,232,0.4)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: "8px",
          }}>
            Display Name
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            maxLength={40}
            style={{
              width: "100%", background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px", padding: "14px 16px",
              color: "#F0EDE8", fontSize: "1rem", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Username */}
        <div style={{ marginBottom: "32px" }}>
          <label style={{
            display: "block", fontSize: "0.78rem", fontWeight: 700,
            color: "rgba(240,237,232,0.4)", letterSpacing: "0.08em",
            textTransform: "uppercase", marginBottom: "8px",
          }}>
            Username
          </label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)",
              color: "rgba(240,237,232,0.4)", fontSize: "1rem", pointerEvents: "none",
            }}>@</span>
            <input
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder="yourhandle"
              maxLength={20}
              style={{
                width: "100%", background: "rgba(255,255,255,0.06)",
                border: `1px solid ${usernameError ? "#e05a5a" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "12px", padding: "14px 16px 14px 32px",
                color: "#F0EDE8", fontSize: "1rem", outline: "none",
                boxSizing: "border-box",
              }}
            />
            {checkingUsername && (
              <span style={{
                position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                fontSize: "0.8rem", color: "rgba(240,237,232,0.35)",
              }}>checking...</span>
            )}
            {!checkingUsername && username && !usernameError && usernameRegex.test(username) && (
              <span style={{
                position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)",
                fontSize: "1rem", color: "#4caf50",
              }}>✓</span>
            )}
          </div>
          {usernameError && (
            <p style={{ color: "#e05a5a", fontSize: "0.78rem", margin: "6px 0 0 4px" }}>
              {usernameError}
            </p>
          )}
          {!usernameError && (
            <p style={{ color: "rgba(240,237,232,0.3)", fontSize: "0.75rem", margin: "6px 0 0 4px" }}>
              3–20 characters, letters, numbers, dots, underscores
            </p>
          )}
        </div>

        <button
          onClick={save}
          disabled={!canSave || loading}
          style={{
            width: "100%", background: canSave ? "#F0EDE8" : "rgba(240,237,232,0.2)",
            color: canSave ? "#080808" : "rgba(240,237,232,0.35)",
            border: "none", borderRadius: "14px", padding: "16px",
            fontWeight: 800, fontSize: "1rem",
            cursor: !canSave || loading ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}

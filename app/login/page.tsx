"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const COUNTRY_CODES = [
  { flag: "🇺🇸", name: "United States", code: "+1" },
  { flag: "🇨🇦", name: "Canada", code: "+1" },
  { flag: "🇬🇧", name: "United Kingdom", code: "+44" },
  { flag: "🇦🇺", name: "Australia", code: "+61" },
  { flag: "🇮🇳", name: "India", code: "+91" },
  { flag: "🇩🇪", name: "Germany", code: "+49" },
  { flag: "🇫🇷", name: "France", code: "+33" },
  { flag: "🇪🇸", name: "Spain", code: "+34" },
  { flag: "🇮🇹", name: "Italy", code: "+39" },
  { flag: "🇧🇷", name: "Brazil", code: "+55" },
  { flag: "🇲🇽", name: "Mexico", code: "+52" },
  { flag: "🇯🇵", name: "Japan", code: "+81" },
  { flag: "🇰🇷", name: "South Korea", code: "+82" },
  { flag: "🇨🇳", name: "China", code: "+86" },
  { flag: "🇸🇦", name: "Saudi Arabia", code: "+966" },
  { flag: "🇦🇪", name: "UAE", code: "+971" },
  { flag: "🇳🇬", name: "Nigeria", code: "+234" },
  { flag: "🇿🇦", name: "South Africa", code: "+27" },
  { flag: "🇵🇭", name: "Philippines", code: "+63" },
  { flag: "🇵🇰", name: "Pakistan", code: "+92" },
  { flag: "🇧🇩", name: "Bangladesh", code: "+880" },
  { flag: "🇮🇩", name: "Indonesia", code: "+62" },
  { flag: "🇹🇷", name: "Turkey", code: "+90" },
  { flag: "🇳🇱", name: "Netherlands", code: "+31" },
  { flag: "🇸🇪", name: "Sweden", code: "+46" },
  { flag: "🇳🇴", name: "Norway", code: "+47" },
  { flag: "🇩🇰", name: "Denmark", code: "+45" },
  { flag: "🇵🇱", name: "Poland", code: "+48" },
  { flag: "🇷🇺", name: "Russia", code: "+7" },
  { flag: "🇨🇭", name: "Switzerland", code: "+41" },
  { flag: "🇦🇹", name: "Austria", code: "+43" },
  { flag: "🇧🇪", name: "Belgium", code: "+32" },
  { flag: "🇵🇹", name: "Portugal", code: "+351" },
  { flag: "🇬🇷", name: "Greece", code: "+30" },
  { flag: "🇮🇱", name: "Israel", code: "+972" },
  { flag: "🇸🇬", name: "Singapore", code: "+65" },
  { flag: "🇲🇾", name: "Malaysia", code: "+60" },
  { flag: "🇹🇭", name: "Thailand", code: "+66" },
  { flag: "🇻🇳", name: "Vietnam", code: "+84" },
  { flag: "🇳🇿", name: "New Zealand", code: "+64" },
  { flag: "🇮🇪", name: "Ireland", code: "+353" },
  { flag: "🇫🇮", name: "Finland", code: "+358" },
  { flag: "🇨🇿", name: "Czech Republic", code: "+420" },
  { flag: "🇷🇴", name: "Romania", code: "+40" },
  { flag: "🇭🇺", name: "Hungary", code: "+36" },
  { flag: "🇦🇷", name: "Argentina", code: "+54" },
  { flag: "🇨🇱", name: "Chile", code: "+56" },
  { flag: "🇨🇴", name: "Colombia", code: "+57" },
  { flag: "🇵🇪", name: "Peru", code: "+51" },
  { flag: "🇪🇬", name: "Egypt", code: "+20" },
  { flag: "🇰🇪", name: "Kenya", code: "+254" },
  { flag: "🇬🇭", name: "Ghana", code: "+233" },
  { flag: "🇪🇹", name: "Ethiopia", code: "+251" },
  { flag: "🇺🇦", name: "Ukraine", code: "+380" },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const filtered = COUNTRY_CODES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search)
  );

  function getFullPhone() {
    const digits = phone.replace(/\D/g, "");
    return `${selectedCountry.code}${digits}`;
  }

  async function sendOTP() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({ phone: getFullPhone() });
    if (error) setError(error.message);
    else setStep("otp");
    setLoading(false);
  }

  async function verifyOTP() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      phone: getFullPhone(),
      token: otp,
      type: "sms",
    });
    if (error) setError(error.message);
    else router.push("/feed");
    setLoading(false);
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "14px 16px",
    color: "#F0EDE8",
    fontSize: "1rem",
    outline: "none",
  };

  const btnPrimary = {
    background: "#F0EDE8",
    color: "#080808",
    border: "none",
    borderRadius: "12px",
    padding: "14px",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer",
    width: "100%",
  };

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "#080808", color: "#F0EDE8" }}
      onClick={() => setShowDropdown(false)}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1 style={{ fontWeight: 800, fontSize: "2.5rem", letterSpacing: "-0.02em", margin: 0 }}>
            ThisFriday
          </h1>
          <p style={{ color: "rgba(240,237,232,0.5)", marginTop: "0.5rem", fontSize: "0.95rem" }}>
            {step === "phone" ? "Enter your phone number" : "Enter the code we sent you"}
          </p>
        </div>

        {step === "phone" ? (
          <div className="flex flex-col gap-3">
            {/* Phone input row */}
            <div style={{ display: "flex", gap: "8px", position: "relative" }}>
              {/* Country code button */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowDropdown((v) => !v); }}
                style={{
                  ...inputStyle,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  flexShrink: 0,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  padding: "14px 12px",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>{selectedCountry.flag}</span>
                <span style={{ fontSize: "0.9rem", color: "rgba(240,237,232,0.7)" }}>{selectedCountry.code}</span>
                <span style={{ fontSize: "0.65rem", color: "rgba(240,237,232,0.4)", marginLeft: "2px" }}>▾</span>
              </button>

              {/* Phone number input */}
              <input
                type="tel"
                placeholder="555 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendOTP()}
                style={{ ...inputStyle, flex: 1 }}
              />

              {/* Dropdown */}
              {showDropdown && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: "260px",
                    background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "12px",
                    zIndex: 100,
                    overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  }}
                >
                  {/* Search */}
                  <div style={{ padding: "8px" }}>
                    <input
                      type="text"
                      placeholder="Search country..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoFocus
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        color: "#F0EDE8",
                        fontSize: "0.85rem",
                        outline: "none",
                      }}
                    />
                  </div>
                  {/* List */}
                  <div style={{ maxHeight: "240px", overflowY: "auto" }}>
                    {filtered.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => {
                          setSelectedCountry(c);
                          setShowDropdown(false);
                          setSearch("");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          width: "100%",
                          padding: "10px 12px",
                          background: selectedCountry.name === c.name ? "rgba(255,255,255,0.08)" : "none",
                          border: "none",
                          color: "#F0EDE8",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          textAlign: "left",
                        }}
                      >
                        <span style={{ fontSize: "1.1rem" }}>{c.flag}</span>
                        <span style={{ flex: 1 }}>{c.name}</span>
                        <span style={{ color: "rgba(240,237,232,0.4)", fontSize: "0.8rem" }}>{c.code}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={sendOTP}
              disabled={loading || !phone}
              style={{ ...btnPrimary, opacity: loading || !phone ? 0.5 : 1 }}
            >
              {loading ? "Sending..." : "Continue"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyOTP()}
              maxLength={6}
              style={{
                ...inputStyle,
                fontSize: "1.5rem",
                letterSpacing: "0.3em",
                width: "100%",
                textAlign: "center",
              }}
            />
            <button
              onClick={verifyOTP}
              disabled={loading || otp.length < 6}
              style={{ ...btnPrimary, opacity: loading || otp.length < 6 ? 0.5 : 1 }}
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
            <button
              onClick={() => { setStep("phone"); setOtp(""); setError(""); }}
              style={{ background: "none", border: "none", color: "rgba(240,237,232,0.4)", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Change number
            </button>
          </div>
        )}

        {error && (
          <p style={{ color: "#ff6b6b", fontSize: "0.85rem", textAlign: "center" }}>{error}</p>
        )}
      </div>
    </main>
  );
}

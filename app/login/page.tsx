"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

type Mode =
  | "login"
  | "signup"
  | "verify"
  | "reset-request"
  | "reset-verify"
  | "reset-new-password";

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  const withoutCountryCode = digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  return `+1${withoutCountryCode.slice(0, 10)}`;
}

export default function LoginPage() {
  const [supabase] = useState(() => createClient());
  const router = useRouter();

  const [phone, setPhone] = useState("+1");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<Mode>("signup");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAuth() {
    setLoading(true);
    setMessage("");

    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();

    if (!trimmedPhone || trimmedPhone === "+1") {
      setMessage("Please enter your phone number.");
      setLoading(false);
      return;
    }

    if (!trimmedPassword) {
      setMessage("Please enter your password.");
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        phone: trimmedPhone,
        password: trimmedPassword,
      });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMode("verify");
      setMessage("We sent a confirmation code to your phone.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      phone: trimmedPhone,
      password: trimmedPassword,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Login succeeded but no user was found.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      setMessage("Could not load your profile. Please try again.");
      setLoading(false);
      return;
    }

    if (!profile?.display_name || !profile?.username) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function handleVerify() {
    setLoading(true);
    setMessage("");

    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();

    if (!trimmedPhone || trimmedPhone === "+1") {
      setMessage("Please enter your phone number.");
      setLoading(false);
      return;
    }

    if (!trimmedCode) {
      setMessage("Please enter the confirmation code.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: trimmedPhone,
      token: trimmedCode,
      type: "sms",
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  async function handleResetRequest() {
    setLoading(true);
    setMessage("");

    const trimmedPhone = phone.trim();

    if (!trimmedPhone || trimmedPhone === "+1") {
      setMessage("Please enter your phone number.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone: trimmedPhone,
      options: {
        shouldCreateUser: false,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setCode("");
    setMode("reset-verify");
    setMessage("We sent a reset code to your phone.");
    setLoading(false);
  }

  async function handleResetVerify() {
    setLoading(true);
    setMessage("");

    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();

    if (!trimmedPhone || trimmedPhone === "+1") {
      setMessage("Please enter your phone number.");
      setLoading(false);
      return;
    }

    if (!trimmedCode) {
      setMessage("Please enter the reset code.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.verifyOtp({
      phone: trimmedPhone,
      token: trimmedCode,
      type: "sms",
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setPassword("");
    setMode("reset-new-password");
    setMessage("Code verified. Enter your new password.");
    setLoading(false);
  }

  async function handleSetNewPassword() {
    setLoading(true);
    setMessage("");

    const trimmedPassword = password.trim();

    if (!trimmedPassword) {
      setMessage("Please enter a new password.");
      setLoading(false);
      return;
    }

    if (trimmedPassword.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: trimmedPassword,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated. Redirecting...");
    router.push("/");
    router.refresh();
  }

  function handleBackFromReset() {
    setMode("login");
    setCode("");
    setPassword("");
    setMessage("");
  }

  const title =
    mode === "login"
      ? "Sign in"
      : mode === "signup"
        ? "Create an account"
        : mode === "verify"
          ? "Verify Your Number"
          : mode === "reset-request"
            ? "Reset password"
            : mode === "reset-verify"
              ? "Verify reset code"
              : "Set new password";

  const subtitle =
    mode === "login"
      ? "Enter your phone number and password"
      : mode === "signup"
        ? "Sign up with your phone number and password"
        : mode === "verify"
          ? "Enter the code we sent to your phone"
          : mode === "reset-request"
            ? "Enter your phone number to receive a reset code"
            : mode === "reset-verify"
              ? "Enter the reset code we sent to your phone"
              : "Choose a new password for your account";

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold">{title}</h1>

        <p className="mt-4 text-zinc-400">{subtitle}</p>

        {mode !== "reset-new-password" && (
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+12505551234"
            value={phone}
            onChange={(e) => setPhone(normalizePhoneInput(e.target.value))}
            className="mt-8 w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
            disabled={mode === "verify" || mode === "reset-verify"}
          />
        )}

        {(mode === "login" || mode === "signup" || mode === "reset-new-password") && (
          <input
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            placeholder={mode === "reset-new-password" ? "New password" : "Password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4 w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />
        )}

        {(mode === "verify" || mode === "reset-verify") && (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Enter 6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-4 w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />
        )}

        <button
          onClick={
            mode === "verify"
              ? handleVerify
              : mode === "reset-request"
                ? handleResetRequest
                : mode === "reset-verify"
                  ? handleResetVerify
                  : mode === "reset-new-password"
                    ? handleSetNewPassword
                    : handleAuth
          }
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-white py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create Account"
                : mode === "verify"
                  ? "Verify Code"
                  : mode === "reset-request"
                    ? "Send Reset Code"
                    : mode === "reset-verify"
                      ? "Verify Reset Code"
                      : "Update Password"}
        </button>

        {mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setMode("reset-request");
              setCode("");
              setPassword("");
              setMessage("");
            }}
            className="mt-4 text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Forgot password?
          </button>
        )}

        {mode === "login" || mode === "signup" ? (
          <p className="mt-4 text-sm text-zinc-400">
            {mode === "login" ? "Need an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setMessage("");
              }}
              className="underline underline-offset-4 hover:text-white"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        ) : (
          <button
            type="button"
            onClick={
              mode === "verify"
                ? () => {
                    setMode("signup");
                    setCode("");
                    setMessage("");
                  }
                : handleBackFromReset
            }
            className="mt-4 text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
          >
            Back
          </button>
        )}

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}
      </div>
    </main>
  );
}
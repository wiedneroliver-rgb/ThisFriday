"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [phone, setPhone] = useState("+1");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Account created, but no user was found.");
        setLoading(false);
        return;
      }

      router.push("/onboarding");
      router.refresh();
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
      .single();

    if (profileError) {
      setMessage(profileError.message);
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold">
          {mode === "login" ? "Login" : "Create Account"}
        </h1>

        <p className="mt-4 text-zinc-400">
          {mode === "login"
            ? "Enter your phone number and password"
            : "Sign up with your phone number and password"}
        </p>

        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+12505551234"
          value={phone}
          onChange={(e) => {
            let value = e.target.value;

            if (!value.startsWith("+1")) {
              value = "+1";
            }

            setPhone(value);
          }}
          className="mt-8 w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        />

        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-4 w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-white py-3 font-semibold text-black disabled:opacity-50"
        >
          {loading
            ? "Loading..."
            : mode === "login"
              ? "Login"
              : "Create Account"}
        </button>

        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
          className="mt-4 text-sm text-zinc-400 underline"
        >
          {mode === "login"
            ? "Need an account? Sign up"
            : "Already have an account? Login"}
        </button>

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}
      </div>
    </main>
  );
}
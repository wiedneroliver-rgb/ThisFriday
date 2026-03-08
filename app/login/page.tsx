"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function sendCode() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      phone: phone,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setStep("code");
    setMessage("Code sent to your phone.");
    setLoading(false);
  }

  async function verifyCode() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: code,
      type: "sms",
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
      setMessage("Login succeeded, but no user was found.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setMessage(profileError.message);
      setLoading(false);
      return;
    }

    if (!profile?.display_name) {
      router.push("/onboarding");
      router.refresh();
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold">Login</h1>

        <p className="mt-4 text-zinc-400">
          Enter your phone number to continue
        </p>

        {step === "phone" && (
          <>
            <input
              type="tel"
              placeholder="+12505551234"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-8 w-full rounded-lg bg-zinc-900 p-4 text-white"
            />

            <button
              onClick={sendCode}
              className="mt-6 w-full rounded-lg bg-white py-3 text-black font-semibold"
            >
              Send Code
            </button>
          </>
        )}

        {step === "code" && (
          <>
            <input
              type="text"
              placeholder="Enter 6 digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-8 w-full rounded-lg bg-zinc-900 p-4 text-white"
            />

            <button
              onClick={verifyCode}
              className="mt-6 w-full rounded-lg bg-white py-3 text-black font-semibold"
            >
              Verify Code
            </button>
          </>
        )}

        {message && <p className="mt-4 text-sm text-zinc-400">{message}</p>}
      </div>
    </main>
  );
}
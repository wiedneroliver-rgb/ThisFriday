"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const trimmedName = displayName.trim();

    if (!trimmedName) {
      setMessage("Please enter a display name.");
      setLoading(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmedName })
      .eq("id", user.id);

    if (error) {
      console.error("Profile update error:", error);
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
        >
          <h1 className="text-4xl font-bold text-center">Set your name</h1>

          <p className="mt-4 text-center text-zinc-400">
            This is how friends will see you in the app
          </p>

          <input
            type="text"
            placeholder="Your display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-8 w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-white py-3 text-black font-semibold disabled:opacity-50"
          >
            {loading ? "Saving..." : "Continue"}
          </button>

          {message && (
            <p className="mt-4 text-center text-sm text-red-400">{message}</p>
          )}
        </form>
      </div>
    </main>
  );
}
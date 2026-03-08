"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedName = displayName.trim();

    if (!trimmedUsername) {
      setMessage("Please enter a username.");
      setLoading(false);
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      setMessage(
        "Username can only use lowercase letters, numbers, and underscores."
      );
      setLoading(false);
      return;
    }

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

    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", trimmedUsername)
      .neq("id", user.id)
      .maybeSingle();

    if (usernameCheckError) {
      console.error("Username check error:", usernameCheckError);
      setMessage("Could not check username. Please try again.");
      setLoading(false);
      return;
    }

    if (existingUsername) {
      setMessage("That username is already taken.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        username: trimmedUsername,
        display_name: trimmedName,
      })
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
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8"
        >
          <h1 className="text-center text-4xl font-bold">Set up your profile</h1>

          <p className="mt-4 text-center text-zinc-400">
            Choose a username friends can search and a display name they will
            see in the app.
          </p>

          <div className="mt-8">
            <label
              htmlFor="username"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Username
            </label>

            <input
              id="username"
              type="text"
              placeholder="oliverw"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
            />

            <p className="mt-2 text-sm text-zinc-500">
              Friends will use this to find you. Keep it original.
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor="displayName"
              className="mb-2 block text-sm font-medium text-zinc-300"
            >
              Display name
            </label>

            <input
              id="displayName"
              type="text"
              placeholder="Oliver"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg bg-zinc-900 p-4 text-white outline-none ring-1 ring-zinc-800 focus:ring-zinc-600"
            />

            <p className="mt-2 text-sm text-zinc-500">
              This is how your name will appear across ThisFriday.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-lg bg-white py-3 font-semibold text-black disabled:opacity-50"
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
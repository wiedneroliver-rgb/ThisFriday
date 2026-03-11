"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/client";

type Friend = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export default function CreateScenePage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<"details" | "invite">("details");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFriends() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: friendRows } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", session.user.id)
        .limit(300);

      const friendIds = (friendRows ?? []).map((r) => r.friend_id);
      if (friendIds.length === 0) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", friendIds);

      setFriends((profiles ?? []) as Friend[]);
    }

    loadFriends();
  }, []);

  function toggleFriend(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 300) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === friends.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(friends.slice(0, 300).map((f) => f.id)));
    }
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const dateTime = new Date(`${date}T${time}`).toISOString();

      // Create the hosted event
      const { data: event, error: eventError } = await supabase
        .from("hosted_events")
        .insert({
          host_id: session.user.id,
          title,
          location,
          date: dateTime,
        })
        .select("id")
        .single();

      if (eventError) {
        console.error("hosted_events insert error:", eventError);
        throw new Error(eventError.message);
        }

        if (!event) {
        throw new Error("No event was returned after insert.");
        }

      const eventId = event.id;
      const invitedIds = Array.from(selectedIds);

      if (invitedIds.length > 0) {
        // Insert guest rows
        await supabase.from("hosted_event_guests").insert(
          invitedIds.map((userId) => ({
            hosted_event_id: eventId,
            user_id: userId,
            status: "invited",
          }))
        );

        // Get host display name for notification message
        const { data: hostProfile } = await supabase
          .from("profiles")
          .select("display_name, username")
          .eq("id", session.user.id)
          .maybeSingle();

        const hostName =
          hostProfile?.display_name?.trim() ||
          hostProfile?.username?.trim() ||
          "Someone";

        // Send notifications to all invited friends
        await supabase.from("notifications").insert(
          invitedIds.map((userId) => ({
            user_id: userId,
            type: "scene_invite",
            actor_id: session.user.id,
            scene_id: eventId,
            message: `${hostName} invited you to ${title}`,
            read: false,
          }))
        );
      }

      router.push(`/scene/${eventId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  const detailsValid = title.trim() && location.trim() && date && time;

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Create Event</h1>
            <p className="mt-1 text-sm text-white/50">
              {step === "details" ? "Event details" : "Invite your friends"}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Cancel
          </Link>
        </div>

        {step === "details" && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm text-white/60">
                Event Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Rooftop Birthday"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-white/60">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Address or venue name"
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-white/40"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm text-white/60">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm text-white/60">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
                />
              </div>
            </div>

            <button
              onClick={() => setStep("invite")}
              disabled={!detailsValid}
              className="mt-2 w-full rounded-full bg-white py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-30"
            >
              Next: Invite Friends
            </button>
          </div>
        )}

        {step === "invite" && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-white/50">
                {selectedIds.size} selected
              </p>
              <button
                onClick={toggleAll}
                className="text-sm text-white/70 transition hover:text-white"
              >
                {selectedIds.size === friends.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {friends.length === 0 ? (
              <p className="text-sm text-white/50">
                You haven't added any friends yet.
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => {
                  const selected = selectedIds.has(friend.id);
                  return (
                    <button
                      key={friend.id}
                      onClick={() => toggleFriend(friend.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        selected
                          ? "border-white/40 bg-white/10"
                          : "border-white/10 bg-white/5 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium">
                        {(friend.display_name || friend.username || "U")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {friend.display_name || "Unnamed"}
                        </p>
                        {friend.username && (
                          <p className="text-xs text-white/40">
                            @{friend.username}
                          </p>
                        )}
                      </div>
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs transition ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/30"
                        }`}
                      >
                        {selected && "✓"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep("details")}
                className="flex-1 rounded-full border border-white/20 py-3 text-sm transition hover:bg-white/10"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-full bg-white py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-30"
              >
                {loading
                  ? "Creating..."
                  : selectedIds.size === 0
                  ? "Create Event"
                  : `Invite ${selectedIds.size} Friend${selectedIds.size === 1 ? "" : "s"}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
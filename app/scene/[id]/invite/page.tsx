"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/client";

type Friend = {
  id: string;
  display_name: string | null;
  username: string | null;
};

export default function InviteMorePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const [{ data: event }, { data: friendRows }, { data: existingGuests }] =
        await Promise.all([
          supabase
            .from("hosted_events")
            .select("title")
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("friends")
            .select("friend_id")
            .eq("user_id", session.user.id)
            .limit(300),
          supabase
            .from("hosted_event_guests")
            .select("user_id")
            .eq("hosted_event_id", id),
        ]);

      setEventTitle(event?.title ?? "");

      const existingGuestIds = new Set(
        (existingGuests ?? []).map((g) => g.user_id)
      );
      const friendIds = (friendRows ?? [])
        .map((r) => r.friend_id)
        .filter((fid) => !existingGuestIds.has(fid));

      if (friendIds.length === 0) return;

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", friendIds);

      setFriends((profiles ?? []) as Friend[]);
    }

    load();
  }, [id]);

  function toggleFriend(friendId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  }

  async function handleInvite() {
    if (selectedIds.size === 0) return;
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      const invitedIds = Array.from(selectedIds);

      await supabase.from("hosted_event_guests").insert(
        invitedIds.map((userId) => ({
          hosted_event_id: id,
          user_id: userId,
          status: "invited",
        }))
      );

      const { data: hostProfile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", session.user.id)
        .maybeSingle();

      const hostName =
        hostProfile?.display_name?.trim() ||
        hostProfile?.username?.trim() ||
        "Someone";

      await supabase.from("notifications").insert(
        invitedIds.map((userId) => ({
          user_id: userId,
          type: "scene_invite",
          actor_id: session.user.id,
          scene_id: id,
          message: `${hostName} invited you to ${eventTitle}`,
          read: false,
        }))
      );

      router.push(`/scene/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Invite Friends</h1>
            {eventTitle && (
              <p className="mt-1 text-sm text-white/50">to {eventTitle}</p>
            )}
          </div>
          <Link
            href={`/scene/${id}`}
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Cancel
          </Link>
        </div>

        {friends.length === 0 ? (
          <p className="text-sm text-white/50">
            All your friends have already been invited.
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
                      : "border-white/10 bg-white/5"
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

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        {friends.length > 0 && (
          <button
            onClick={handleInvite}
            disabled={loading || selectedIds.size === 0}
            className="mt-6 w-full rounded-full bg-white py-3 font-medium text-black transition hover:opacity-90 disabled:opacity-30"
          >
            {loading
              ? "Inviting..."
              : `Invite ${selectedIds.size || ""} Friend${selectedIds.size === 1 ? "" : "s"}`}
          </button>
        )}
      </div>
    </main>
  );
}
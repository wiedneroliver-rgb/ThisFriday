"use client";

import { useState } from "react";
import { createClient } from "@/lib/client";
import UserAvatar from "@/components/UserAvatar";

type Friend = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default function InviteFriends({
  friends,
  eventId,
  eventTitle,
  actorName,
}: {
  friends: Friend[];
  eventId: number;
  eventTitle: string;
  // Pass actor name from server — avoids a DB fetch on every invite send
  actorName: string;
}) {
  // Stable client instance — createClient() only called once on mount
  const [supabase] = useState(() => createClient());

  // Use a Set for O(1) lookups in the render loop instead of array.includes()
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());

  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  function toggleFriend(friendId: string) {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  }

  async function sendInvites() {
    if (selectedSet.size === 0) return;

    setSending(true);
    setStatusMessage(null);

    // getSession reads from local cache — no network roundtrip
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      setStatusMessage("You must be logged in.");
      setSending(false);
      return;
    }

    const notifications = Array.from(selectedSet).map((friendId) => ({
      user_id: friendId,
      type: "event_invite",
      actor_id: session.user.id,
      event_id: eventId,
      message: `${actorName} invited you to ${eventTitle}. Want to tag along?`,
    }));

    const { error } = await supabase
      .from("notifications")
      .insert(notifications);

    if (error) {
      console.error(error);
      setStatusMessage("Failed to send invites.");
      setSending(false);
      return;
    }

    setStatusMessage("Invites sent!");
    setSelectedSet(new Set());
    setSending(false);
  }

  return (
    <>
      <div className="space-y-3">
        {friends.map((friend) => {
          const checked = selectedSet.has(friend.id);

          return (
            <div
              key={friend.id}
              onClick={() => toggleFriend(friend.id)}
              className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition ${
                checked
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-white/5 text-white"
              }`}
            >
              <UserAvatar
                src={friend.avatar_url}
                fallback={friend.display_name || "Unknown"}
                size="h-9 w-9"
              />

              <p className="text-sm flex-1">
                {friend.display_name || "Unknown"}
              </p>

              <input type="checkbox" checked={checked} readOnly />
            </div>
          );
        })}
      </div>

      {friends.length > 0 && (
        <div className="mt-6 space-y-3">
          <button
            onClick={sendInvites}
            disabled={sending || selectedSet.size === 0}
            className="w-full rounded-full bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
          >
            {sending
              ? "Sending..."
              : `Invite ${selectedSet.size > 0 ? selectedSet.size + " " : ""}Friends`}
          </button>

          {/* Inline status message — replaces blocking alert() calls */}
          {statusMessage && (
            <p className="text-center text-sm text-zinc-400">{statusMessage}</p>
          )}
        </div>
      )}
    </>
  );
}
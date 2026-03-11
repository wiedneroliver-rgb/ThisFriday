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
}: {
  friends: Friend[];
  eventId: number;
  eventTitle: string;
}) {
  const supabase = createClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  function toggleFriend(friendId: string) {
    setSelected((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  }

  async function sendInvites() {
    if (selected.length === 0) return;

    setSending(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    const actorName = profile?.display_name || "Someone";

    const notifications = selected.map((friendId) => ({
      user_id: friendId,
      type: "event_invite",
      actor_id: user.id,
      event_id: eventId,
      message: `${actorName} invited you to ${eventTitle}. Want to tag along?`,
    }));

    const { error } = await supabase.from("notifications").insert(notifications);

    if (error) {
      console.error(error);
      alert("Failed to send invites.");
      setSending(false);
      return;
    }

    alert("Invites sent!");
    setSelected([]);
    setSending(false);
  }

  return (
    <>
      <div className="space-y-3">
        {friends.map((friend) => {
          const checked = selected.includes(friend.id);

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

              <input
                type="checkbox"
                checked={checked}
                readOnly
              />
            </div>
          );
        })}
      </div>

      {friends.length > 0 && (
        <button
          onClick={sendInvites}
          disabled={sending || selected.length === 0}
          className="mt-6 w-full rounded-full bg-white px-4 py-3 font-semibold text-black disabled:opacity-50"
        >
          {sending ? "Sending..." : `Invite ${selected.length || ""} Friends`}
        </button>
      )}
    </>
  );
}
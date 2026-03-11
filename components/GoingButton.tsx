"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

type GoingButtonProps = {
  eventId: number;
  initialGoing: boolean;
  onToggle?: (nextGoing: boolean) => void;
};

export default function GoingButton({
  eventId,
  initialGoing,
  onToggle,
}: GoingButtonProps) {
  const [supabase] = useState(() => createClient());
  const [going, setGoing] = useState(initialGoing);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setGoing(initialGoing);
  }, [initialGoing]);

  const handleClick = async () => {
    if (loading) return;

    setLoading(true);

    // getSession reads from local cache — no network roundtrip
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    if (!user) {
      alert("Please log in first.");
      setLoading(false);
      router.push("/login");
      return;
    }

    const userId = user.id;

    if (going) {
      const { error } = await supabase
        .from("going")
        .delete()
        .eq("user_id", userId)
        .eq("event_id", eventId);

      if (error) {
        alert("Could not remove RSVP.");
        console.error(error);
        setLoading(false);
        return;
      }

      setGoing(false);
      onToggle?.(false);
      setLoading(false);

      router.refresh();

      return;
    }

    const { error } = await supabase.from("going").insert([
      {
        user_id: userId,
        event_id: eventId,
      },
    ]);

    if (error && error.code !== "23505") {
      alert("Could not save RSVP.");
      console.error(error);
      setLoading(false);
      return;
    }

    setGoing(true);
    onToggle?.(true);

    try {
      const [{ data: friendRows }, { data: profile }, { data: event }] =
        await Promise.all([
          supabase.from("friends").select("user_id").eq("friend_id", userId),
          supabase
            .from("profiles")
            .select("display_name")
            .eq("id", userId)
            .maybeSingle(),
          supabase
            .from("events")
            .select("title")
            .eq("id", eventId)
            .maybeSingle(),
        ]);

      const friendUserIds = (friendRows ?? []).map((row) => row.user_id);

      if (friendUserIds.length > 0) {
        const actorName = profile?.display_name || "Someone";
        const eventTitle = event?.title || "an event";

        const notifications = friendUserIds.map((friendUserId) => ({
          user_id: friendUserId,
          type: "friend_going",
          actor_id: userId,
          event_id: eventId,
          message: `${actorName} is going to ${eventTitle}`,
        }));

        const { error: notificationError } = await supabase
          .from("notifications")
          .insert(notifications);

        if (notificationError) {
          console.error("Error creating notifications:", notificationError);
        }
      }
    } catch (notificationCatchError) {
      console.error("Unexpected notification error:", notificationCatchError);
    }

    setLoading(false);

    router.refresh();
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "..." : going ? "Going ✓" : "I'm Going"}
    </button>
  );
}
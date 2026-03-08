"use client";

import { useState } from "react";
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
  const [going, setGoing] = useState(initialGoing);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const handleClick = async () => {
    if (loading) return;

    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
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
    } else {
      const { error } = await supabase.from("going").insert([
        {
          user_id: userId,
          event_id: eventId,
        },
      ]);

      if (error) {
        alert("Could not save RSVP.");
        console.error(error);
        setLoading(false);
        return;
      }

      setGoing(true);
      onToggle?.(true);
    }

    setLoading(false);
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
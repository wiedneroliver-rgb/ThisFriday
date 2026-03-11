import Link from "next/link";
import { createClient } from "@/lib/server";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import InviteFriends from "@/components/InviteFriends";

export default async function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) {
    redirect("/");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .maybeSingle();

  const { data: friends } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", user.id);

  const friendIds = (friends ?? []).map((friend) => String(friend.friend_id));

  const { data: friendProfiles } = friendIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", friendIds)
    : { data: [] };

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <Link
          href={`/events/${eventId}`}
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to event
        </Link>

        <h1 className="mt-6 text-3xl font-bold">Make a Plan</h1>

        <p className="mt-2 text-zinc-400">
          Invite friends to go to{" "}
          <span className="font-semibold text-white">
            {event?.title || "this event"}
          </span>.
        </p>

        <p className="mt-1 text-sm text-zinc-500">
          Select friends below and send them an invite.
        </p>

        <div className="mt-8">
          {friendProfiles && friendProfiles.length > 0 ? (
            <InviteFriends
              friends={friendProfiles}
              eventId={eventId}
              eventTitle={event?.title || "this event"}
            />
          ) : (
            <p className="text-zinc-400">You have no friends to invite yet.</p>
          )}
        </div>
      </div>
    </main>
  );
}
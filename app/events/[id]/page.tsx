import Link from "next/link";
import { createClient } from "@/lib/server";

type EventDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatEventDate(date: string, time: string) {
  const eventDate = new Date(`${date}T${time}`);

  const dayLabel = eventDate.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const timeLabel = eventDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dayLabel} • ${timeLabel}`;
}

export default async function EventDetailsPage({
  params,
}: EventDetailsPageProps) {
  const { id } = await params;
  const eventId = Number(id);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? null;

  const { data: event, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  const { count: goingCount } = await supabase
    .from("going")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (Number.isNaN(eventId) || error || !event) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-10">
        <div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-zinc-950 p-5">
          <h1 className="text-xl font-bold text-red-400">Event not found</h1>
        </div>
      </main>
    );
  }

  const { data: friends } = currentUserId
    ? await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", currentUserId)
    : { data: [] };

  const friendIdList = (friends ?? []).map((friend) => String(friend.friend_id));

  const { data: friendGoingRows } = friendIdList.length
    ? await supabase
        .from("going")
        .select("user_id")
        .eq("event_id", eventId)
        .in("user_id", friendIdList)
    : { data: [] };

  const goingFriendIds = (friendGoingRows ?? []).map((row) => String(row.user_id));

  const { data: friendProfiles } = goingFriendIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", goingFriendIds)
    : { data: [] };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-md border-x border-white/10 bg-black px-4 pb-12">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="py-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Event Details
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {event.title}
            </h1>
          </div>
        </header>

        <section className="pt-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-lg text-zinc-400">{event.venue}</p>

            <p className="mt-6 text-lg text-zinc-500">
              {formatEventDate(event.date, event.start_time)}
            </p>

            <div className="mt-8 border-t border-white/10 pt-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                About
              </p>

              <p className="mt-4 text-base leading-7 text-zinc-400">
                {event.description || "No description yet."}
              </p>

              <p className="mt-8 text-lg text-zinc-400">
                {goingCount ?? 0} people going
              </p>

              <div className="mt-10 border-t border-white/10 pt-8">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Friends Going
                </p>

                {friendProfiles && friendProfiles.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {friendProfiles.map((friend) => (
                      <Link
                        key={friend.id}
                        href={`/user/${friend.id}`}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition"
                      >
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                          {friend.display_name?.[0]?.toUpperCase() ?? "?"}
                        </div>

                        <p className="text-sm text-zinc-200">
                          {friend.display_name || "Unknown"}
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-zinc-400">No friends going yet.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
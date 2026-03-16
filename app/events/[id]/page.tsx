import Link from "next/link";
import { createClient } from "@/lib/server";
import { ArrowLeft } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import GoingButton from "@/components/GoingButton";

type EventDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    from?: string;
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
  searchParams,
}: EventDetailsPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const eventId = Number(id);

  if (Number.isNaN(eventId)) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-zinc-950 p-5">
          <h1 className="text-xl font-bold text-red-400">Event not found</h1>
        </div>
      </main>
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id ?? null;

  const [
    { data: event, error },
    { count: goingCount },
    { data: goingRows },
  ] = await Promise.all([
    supabase
      .from("events")
      .select(
        "id, title, venue, description, date, start_time, ticket_link"
      )
      .eq("id", eventId)
      .eq("is_archived", false)
      .maybeSingle(),
    supabase
      .from("going")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    currentUserId
      ? supabase.from("going").select("user_id").eq("event_id", eventId)
      : Promise.resolve({ data: [] }),
  ]);

  if (error || !event) {
    return (
      <main className="min-h-screen bg-black px-4 py-10 text-white">
        <div className="mx-auto max-w-md rounded-3xl border border-red-500/20 bg-zinc-950 p-5">
          <h1 className="text-xl font-bold text-red-400">Event not found</h1>
        </div>
      </main>
    );
  }

  const currentUserGoing = (goingRows ?? []).some(
    (row) => String(row.user_id) === currentUserId
  );

  const { data: friends } = currentUserId
    ? await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", currentUserId)
    : { data: [] };

  const friendIdList = (friends ?? []).map((friend) => String(friend.friend_id));

  const goingUserIds = (goingRows ?? []).map((row) => String(row.user_id));
  const goingFriendIds = goingUserIds.filter((id) => friendIdList.includes(id));

  const { data: friendProfiles } = goingFriendIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", goingFriendIds)
    : { data: [] };

  const backHref =
    resolvedSearchParams?.from === "notifications" ? "/notifications" : "/";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-md border-x border-white/10 bg-black px-4 pb-12">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="flex items-center gap-3 py-4">
            <Link
              href={backHref}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white hover:text-black"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Event Details
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                {event.title}
              </h1>
            </div>
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

              {event.ticket_link && (
                <div className="mt-6">
                  <a
                    href={event.ticket_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
                  >
                    Get Tickets
                  </a>
                </div>
              )}

              <div className="mt-8 flex items-center justify-between gap-4">
                <p className="text-lg text-zinc-400">
                  {goingCount ?? 0} people going
                </p>

                {currentUserId && (
                  <GoingButton
                    eventId={event.id}
                    initialGoing={currentUserGoing}
                  />
                )}
              </div>

              {currentUserId && currentUserGoing && (
                <div className="mt-4">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/events/${event.id}/plan`}
                      className="inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
                    >
                      Make a Plan
                    </Link>

                    <span className="text-sm text-zinc-400 flex items-center gap-1">
                      ← invite your friends
                    </span>
                  </div>
                </div>
              )}

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
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                      >
                        <UserAvatar
                          src={friend.avatar_url}
                          fallback={friend.display_name || "Unknown"}
                          size="h-9 w-9"
                        />

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
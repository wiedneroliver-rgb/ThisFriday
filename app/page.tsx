import Link from "next/link";
import { redirect } from "next/navigation";
import FriendsActivityFeed, {
  type FriendFeedItem,
} from "@/components/FriendsActivityFeed";
import EventCard from "@/components/EventCard";
import { createClient } from "@/lib/server";
import NotificationBell from "@/components/NotificationBell";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

type FriendPreview = {
  name: string;
  avatar: string | null;
};

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("Error getting user:", userError);
  }

  const currentUserId = user?.id ?? null;

  const { data: currentProfile } = currentUserId
    ? await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", currentUserId)
        .maybeSingle()
    : { data: null };

  if (
    currentUserId &&
    (!currentProfile?.display_name || !currentProfile?.username)
  ) {
    redirect("/onboarding");
  }

  const { data: events, error } = await supabase
    .from("events")
    .select("id, title, venue, description, date, start_time")
    .order("date", { ascending: true });

  const { data: friends } = currentUserId
    ? await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", currentUserId)
    : { data: [] };

  const friendIdList = (friends ?? []).map((friend) => String(friend.friend_id));

  const { data: friendProfilesData } = friendIdList.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", friendIdList)
    : { data: [] };

  // --- OPTIMIZED: Single going query filtered to upcoming event IDs only ---
  const upcomingEventIds = (events ?? []).map((e) => e.id);

  const { data: goingRows } = upcomingEventIds.length
    ? await supabase
        .from("going")
        .select("user_id, event_id, created_at")
        .in("event_id", upcomingEventIds)
    : { data: [] };

  // Derive friend going rows in-memory instead of a second DB query
  const friendGoingRows = friendIdList.length
    ? (goingRows ?? []).filter((row) =>
        friendIdList.includes(String(row.user_id))
      )
    : [];
  // -------------------------------------------------------------------------

  const friendProfiles = new Map(
    (friendProfilesData ?? []).map((profile) => [
      String(profile.id),
      {
        name: profile.display_name,
        avatar: profile.avatar_url,
      },
    ])
  );

  const eventMap = new Map((events ?? []).map((event) => [event.id, event]));

  const goingCounts: Record<number, number> = {};

  (goingRows ?? []).forEach((row) => {
    if (!goingCounts[row.event_id]) {
      goingCounts[row.event_id] = 0;
    }
    goingCounts[row.event_id] += 1;
  });

  const friendActivity: Record<number, FriendPreview[]> = {};

  friendGoingRows.forEach((row) => {
    const userId = String(row.user_id);

    if (!friendActivity[row.event_id]) {
      friendActivity[row.event_id] = [];
    }

    const friend = friendProfiles.get(userId);

    if (friend) {
      friendActivity[row.event_id].push({
        name: friend.name ?? "Unknown",
        avatar: friend.avatar ?? null,
      });
    }
  });

  const friendGoingEvents = (events ?? []).filter(
    (event) => (friendActivity[event.id] || []).length > 0
  );

  const friendGoingEventIds = new Set(friendGoingEvents.map((event) => event.id));

  const trendingEvents = (events ?? [])
    .filter((event) => !friendGoingEventIds.has(event.id))
    .map((event) => ({
      ...event,
      goingCount: goingCounts[event.id] || 0,
    }))
    .sort((a, b) => b.goingCount - a.goingCount)
    .slice(0, 3);

  const trendingEventIds = new Set(trendingEvents.map((event) => event.id));

  const nonTrendingEvents = (events ?? []).filter(
    (event) =>
      !friendGoingEventIds.has(event.id) && !trendingEventIds.has(event.id)
  );

  const userGoingEventIds = new Set(
    (goingRows ?? [])
      .filter((row) => currentUserId && String(row.user_id) === currentUserId)
      .map((row) => row.event_id)
  );

  const friendFeedItems: FriendFeedItem[] = friendGoingRows
    .map((row) => {
      const userId = String(row.user_id);
      const friend = friendProfiles.get(userId);
      const event = eventMap.get(row.event_id);

      if (!friend || !event) return null;

      return {
        id: `${userId}-${row.event_id}-${row.created_at}`,
        friendId: userId,
        friendName: friend.name ?? "Unknown",
        friendAvatar: friend.avatar ?? null,
        eventTitle: event.title ?? "Unknown event",
        venue: event.venue ?? "Unknown venue",
        eventDate: event.date ?? "",
        eventTime: event.start_time ?? "",
        createdAt: row.created_at,
      };
    })
    .filter((item): item is FriendFeedItem => item !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-md border-x border-white/10 bg-black px-4 pb-12">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Victoria Nightlife
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight">
                ThisFriday
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {currentUserId && <NotificationBell />}

              {currentUserId && (
                <Link
                  href="/profile"
                  className="flex h-9 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                >
                  Profile
                </Link>
              )}

              {currentUserId && (
                <Link
                  href="/friends"
                  className="flex h-9 items-center rounded-full border border-white/10 bg-white/5 px-4 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
                >
                  Find Friends
                </Link>
              )}
            </div>
          </div>
        </header>

        <section className="pt-6">
          <p className="text-sm text-zinc-400">
            See where your friends are going out this week.
          </p>
        </section>

        {!currentUserId && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-zinc-300">
              Log in to see your friends, RSVP to events, and personalize your
              nightlife feed.
            </p>

            <Link
              href="/login"
              className="mt-6 flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-base font-semibold text-black transition hover:opacity-90"
            >
              Get Started
            </Link>
          </section>
        )}

        <section className="mt-8">
          <FriendsActivityFeed items={friendFeedItems} />
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Friends Are Going
          </h2>

          <div className="space-y-5">
            {friendGoingEvents.map((event) => (
              <EventCard
                key={`friends-${event.id}`}
                event={event}
                goingCount={goingCounts[event.id] || 0}
                initialGoing={userGoingEventIds.has(event.id)}
                friendPreviews={friendActivity[event.id] || []}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Trending Tonight
          </h2>

          <div className="space-y-5">
            {trendingEvents.map((event) => (
              <EventCard
                key={`trending-${event.id}`}
                event={event}
                goingCount={goingCounts[event.id] || 0}
                initialGoing={userGoingEventIds.has(event.id)}
                friendPreviews={friendActivity[event.id] || []}
              />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            All Events
          </h2>

          <div className="space-y-5">
            {nonTrendingEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                goingCount={goingCounts[event.id] || 0}
                initialGoing={userGoingEventIds.has(event.id)}
                friendPreviews={friendActivity[event.id] || []}
              />
            ))}
          </div>
        </section>

        {currentUserId && (
          <section className="mt-12">
            <LogoutButton />
          </section>
        )}

        {error && <p className="mt-8 text-sm text-red-400">{error.message}</p>}
      </div>
    </main>
  );
}
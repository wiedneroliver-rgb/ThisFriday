import { createClient } from "@/lib/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import UserAvatar from "@/components/UserAvatar";
import GoingButton from "@/components/GoingButton";
import { revalidatePath } from "next/cache";

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
};

async function removeFriend(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const friendId = formData.get("friend_id") as string;

  if (!friendId || friendId === user.id) {
    redirect("/");
  }

  // Delete both directions of the friendship
  await Promise.all([
    supabase
      .from("friends")
      .delete()
      .eq("user_id", user.id)
      .eq("friend_id", friendId),
    supabase
      .from("friends")
      .delete()
      .eq("user_id", friendId)
      .eq("friend_id", user.id),
  ]);

  revalidatePath("/friends");
  revalidatePath("/");
  redirect("/friends");
}

export default async function UserPage({
  params,
  searchParams,
}: UserPageProps) {
  const { id } = await params;
  const { from } = await searchParams;
  const backHref =
    typeof from === "string" && from.startsWith("/") ? from : "/";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: viewedUserFriendRows },
    { data: currentUserFriendRows },
    { data: viewedUserGoingRows },
    { data: currentUserGoingRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, username, avatar_url")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", id)
      .limit(500),

    supabase
      .from("friends")
      .select("friend_id")
      .eq("user_id", user.id)
      .limit(500),

    supabase
      .from("going")
      .select("event_id")
      .eq("user_id", id)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),

    supabase
      .from("going")
      .select("event_id")
      .eq("user_id", user.id)
      .gte(
        "created_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      ),
  ]);

  if (!profile) {
    notFound();
  }

  const friendCount = (viewedUserFriendRows ?? []).length;

  const viewedUserFriendIds = new Set(
    (viewedUserFriendRows ?? []).map((row) => row.friend_id)
  );

  const currentUserFriendIds = new Set(
    (currentUserFriendRows ?? []).map((row) => row.friend_id)
  );

  const isFriend = currentUserFriendIds.has(id);

  const mutualFriendCount = Array.from(viewedUserFriendIds).filter(
    (friendId) => currentUserFriendIds.has(friendId)
  ).length;

  const viewedEventIds = (viewedUserGoingRows ?? []).map((row) => row.event_id);
  const currentUserEventIds = new Set(
    (currentUserGoingRows ?? []).map((row) => row.event_id)
  );

  const bothGoingEventIds = viewedEventIds.filter((eventId) =>
    currentUserEventIds.has(eventId)
  );

  const theyAreGoingOnlyEventIds = viewedEventIds.filter(
    (eventId) => !currentUserEventIds.has(eventId)
  );

  const [{ data: bothGoingEvents }, { data: theyAreGoingOnlyEvents }] =
    await Promise.all([
      bothGoingEventIds.length
        ? supabase
            .from("events")
            .select("id, title, venue, date")
            .in("id", bothGoingEventIds)
            .eq("is_archived", false)
            .order("date", { ascending: true })
        : Promise.resolve({ data: [] }),
      theyAreGoingOnlyEventIds.length
        ? supabase
            .from("events")
            .select("id, title, venue, date")
            .in("id", theyAreGoingOnlyEventIds)
            .eq("is_archived", false)
            .order("date", { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-md border-x border-white/10 bg-black px-4 pb-12">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="py-4">
            <Link
              href={backHref}
              className="inline-block text-sm text-zinc-400 transition hover:text-white"
            >
              ← Back
            </Link>

            <div className="mt-4 flex items-center gap-4">
              <UserAvatar
                src={profile.avatar_url}
                fallback={profile.display_name || profile.username || "User"}
                size="h-16 w-16"
              />

              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  Profile
                </p>

                <h1 className="truncate text-2xl font-bold tracking-tight">
                  {profile.display_name || "User"}
                </h1>

                {profile.username && (
                  <p className="text-sm text-zinc-500">@{profile.username}</p>
                )}

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-400">
                  <p>{friendCount} friends</p>
                  <p>{mutualFriendCount} mutual friends</p>
                </div>

                {isFriend && (
                  <form action={removeFriend} className="mt-3">
                    <input type="hidden" name="friend_id" value={id} />
                    <button
                      type="submit"
                      className="rounded-full border border-red-500/30 px-4 py-1.5 text-xs text-red-400 transition hover:border-red-500 hover:bg-red-500/10"
                    >
                      Remove Friend
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </header>

        <section className="pt-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Events you are both going to
            </p>

            {bothGoingEvents && bothGoingEvents.length > 0 ? (
              <div className="mt-4 space-y-3">
                {bothGoingEvents.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                  >
                    <p className="text-sm text-zinc-200">{event.title}</p>
                    <p className="text-xs text-zinc-400">{event.venue}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-zinc-400">No shared events yet.</p>
            )}
          </div>
        </section>

        <section className="pt-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              They're going, you're not yet
            </p>

            {theyAreGoingOnlyEvents && theyAreGoingOnlyEvents.length > 0 ? (
              <div className="mt-4 space-y-3">
                {theyAreGoingOnlyEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <Link
                      href={`/events/${event.id}`}
                      className="block transition hover:opacity-80"
                    >
                      <p className="text-sm text-zinc-200">{event.title}</p>
                      <p className="text-xs text-zinc-400">{event.venue}</p>
                    </Link>

                    <GoingButton eventId={event.id} initialGoing={false} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-zinc-400">
                No extra events they're going to right now.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
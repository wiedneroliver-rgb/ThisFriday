import { createClient } from "@/lib/server";
import { redirect } from "next/navigation";
import Link from "next/link";

async function addFriend(formData: FormData) {
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
    redirect("/friends");
  }

  const [
    { data: existingFriendRows },
    { data: existingRequest },
    { data: senderProfile },
  ] = await Promise.all([
    supabase
      .from("friends")
      .select("user_id, friend_id")
      .or(
        `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
      ),
    supabase
      .from("notifications")
      .select("id")
      .eq("type", "friend_request")
      .eq("actor_id", user.id)
      .eq("user_id", friendId)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const alreadyFriends = (existingFriendRows ?? []).length > 0;

  if (alreadyFriends || existingRequest) {
    redirect("/friends");
  }

  const senderName =
    senderProfile?.display_name?.trim() ||
    senderProfile?.username?.trim() ||
    "Someone";

  const { error } = await supabase.from("notifications").insert({
    user_id: friendId,
    type: "friend_request",
    actor_id: user.id,
    message: `${senderName} sent you a friend request`,
    read: false,
  });

  if (error) {
    console.error("Error sending friend request:", error);
    throw new Error("Failed to send friend request");
  }

  redirect("/friends");
}

type ProfileRow = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

type SuggestedFriend = ProfileRow & {
  mutualCount: number;
};

function InitialAvatar({ name }: { name: string | null }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
      {(name || "U")[0]?.toUpperCase()}
    </div>
  );
}

// Extracted shared component — used by both search results and suggested friends
function FriendRow({
  profile,
  friendIdSet,
  outgoingRequestIds,
  incomingRequestIds,
  mutualCount,
}: {
  profile: ProfileRow;
  friendIdSet: Set<string>;
  outgoingRequestIds: Set<string>;
  incomingRequestIds: Set<string>;
  mutualCount?: number;
}) {
  // O(1) Set lookups instead of O(n) array includes
  const isFriend = friendIdSet.has(profile.id);
  const isPending = outgoingRequestIds.has(profile.id);
  const hasIncomingRequest = incomingRequestIds.has(profile.id);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <Link
        href={`/user/${profile.id}?from=/friends`}
        className="flex items-center gap-3 transition hover:opacity-80"
      >
        <InitialAvatar name={profile.display_name} />

        <div>
          <p className="font-medium">
            {profile.display_name || "Unnamed user"}
          </p>
          {mutualCount !== undefined && (
            <p className="text-sm text-white/50">
              {mutualCount} mutual {mutualCount === 1 ? "friend" : "friends"}
            </p>
          )}
        </div>
      </Link>

      {isFriend ? (
        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/50">
          Friends
        </div>
      ) : hasIncomingRequest ? (
        <Link
          href="/notifications"
          className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
        >
          Respond
        </Link>
      ) : isPending ? (
        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/50">
          Pending
        </div>
      ) : (
        <form action={addFriend}>
          <input type="hidden" name="friend_id" value={profile.id} />
          <button
            type="submit"
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Send Request
          </button>
        </form>
      )}
    </div>
  );
}

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { q = "" } = await searchParams;
  const trimmedQuery = q.trim();

  // --- OPTIMIZED: Run all independent queries in parallel in a single round ---
  const [
    { data: friendRows },
    { data: requestRows },
    searchResultsData,
  ] = await Promise.all([
    supabase.from("friends").select("friend_id").eq("user_id", user.id),

    // Limit request rows to prevent unbounded fetch
    supabase
      .from("notifications")
      .select("actor_id, user_id, type")
      .eq("type", "friend_request")
      .or(`actor_id.eq.${user.id},user_id.eq.${user.id}`)
      .limit(200),

    // Search by both display_name and username in the same round
    trimmedQuery
      ? supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .or(`display_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%`)
          .neq("id", user.id)
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);
  // --------------------------------------------------------------------------

  const friendIds = friendRows?.map((row) => row.friend_id) ?? [];

  // Use a Set for O(1) lookups in render — avoids O(n) array.includes() in loops
  const friendIdSet = new Set(friendIds);
  const excludedIdSet = new Set([user.id, ...friendIds]);

  const outgoingRequestIds = new Set(
    (requestRows ?? [])
      .filter((row) => row.actor_id === user.id)
      .map((row) => row.user_id)
  );

  const incomingRequestIds = new Set(
    (requestRows ?? [])
      .filter((row) => row.user_id === user.id)
      .map((row) => row.actor_id)
  );

  const searchResults: ProfileRow[] = (searchResultsData.data as ProfileRow[]) ?? [];

  // --- OPTIMIZED: Fetch friend profiles and second-degree connections in parallel ---
  const [friendsListData, secondDegreeData] = await Promise.all([
    friendIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", friendIds)
      : Promise.resolve({ data: [] }),

    friendIds.length > 0
      ? supabase
          .from("friends")
          .select("user_id, friend_id")
          .in("user_id", friendIds)
          .limit(500) // Prevent unbounded row fetch as friend network grows
      : Promise.resolve({ data: [] }),
  ]);
  // ------------------------------------------------------------------------------

  const friendsList: ProfileRow[] = (friendsListData.data as ProfileRow[]) ?? [];

  // Build mutual friend counts in-memory
  const mutualCounts = new Map<string, number>();

  (secondDegreeData.data ?? []).forEach((row) => {
    const suggestedId = row.friend_id;

    // O(1) Set lookup instead of O(n) array includes
    if (excludedIdSet.has(suggestedId)) return;

    mutualCounts.set(suggestedId, (mutualCounts.get(suggestedId) ?? 0) + 1);
  });

  const suggestedIds = Array.from(mutualCounts.keys());

  let suggestedFriends: SuggestedFriend[] = [];

  if (suggestedIds.length > 0) {
    const { data: suggestedProfiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", suggestedIds);

    suggestedFriends = ((suggestedProfiles ?? []) as ProfileRow[])
      .map((profile) => ({
        ...profile,
        mutualCount: mutualCounts.get(profile.id) ?? 0,
      }))
      .sort((a, b) => b.mutualCount - a.mutualCount);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Find Friends</h1>
            <p className="mt-2 text-sm text-white/70">
              Search for people and add them to your network.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Back
          </Link>
        </div>

        <form action="/friends" className="mb-8 flex gap-3">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search by name or username..."
            className="flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/40"
          />
          <button
            type="submit"
            className="rounded-xl bg-white px-5 py-3 font-medium text-black transition hover:opacity-90"
          >
            Search
          </button>
        </form>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Suggested Friends</h2>

          {suggestedFriends.length === 0 ? (
            <p className="text-sm text-white/50">
              No friend suggestions yet. Add a few friends first.
            </p>
          ) : (
            <div className="space-y-3">
              {suggestedFriends.map((profile) => (
                <FriendRow
                  key={profile.id}
                  profile={profile}
                  friendIdSet={friendIdSet}
                  outgoingRequestIds={outgoingRequestIds}
                  incomingRequestIds={incomingRequestIds}
                  mutualCount={profile.mutualCount}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Search Results</h2>

          {!trimmedQuery ? (
            <p className="text-sm text-white/50">Search for a friend above.</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-white/50">No users found.</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((profile) => (
                <FriendRow
                  key={profile.id}
                  profile={profile}
                  friendIdSet={friendIdSet}
                  outgoingRequestIds={outgoingRequestIds}
                  incomingRequestIds={incomingRequestIds}
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Your Friends</h2>

          {friendsList.length === 0 ? (
            <p className="text-sm text-white/50">
              You haven't added any friends yet.
            </p>
          ) : (
            <div className="space-y-3">
              {friendsList.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/user/${friend.id}?from=/friends`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition hover:bg-white/10"
                >
                  <InitialAvatar name={friend.display_name} />
                  <p className="font-medium">
                    {friend.display_name || "Unnamed user"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
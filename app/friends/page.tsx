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

function InitialAvatar({
  name,
  avatarUrl,
}: {
  name: string | null;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || "User avatar"}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
      {(name || "U")[0]?.toUpperCase()}
    </div>
  );
}

function FriendRow({
  profile,
  friendIds,
  outgoingIds,
  incomingIds,
  mutualCount,
  onAddFriend,
}: {
  profile: ProfileRow;
  friendIds: string[];
  outgoingIds: string[];
  incomingIds: string[];
  mutualCount?: number;
  onAddFriend: (formData: FormData) => Promise<void>;
}) {
  const friendIdSet = new Set(friendIds);
  const outgoingSet = new Set(outgoingIds);
  const incomingSet = new Set(incomingIds);

  const isFriend = friendIdSet.has(profile.id);
  const isPending = outgoingSet.has(profile.id);
  const hasIncomingRequest = incomingSet.has(profile.id);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
      <Link
        href={`/user/${profile.id}?from=/friends`}
        className="flex items-center gap-3 transition hover:opacity-80"
      >
        <InitialAvatar
          name={profile.display_name}
          avatarUrl={profile.avatar_url}
        />

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
        <form action={onAddFriend}>
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

  const [
    { data: friendRows },
    { data: incomingRequestRows },
    { data: outgoingRequestRows },
    searchResultsData,
  ] = await Promise.all([
    supabase
      .from("friends")
      .select("user_id, friend_id")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),

    supabase
      .from("notifications")
      .select("actor_id")
      .eq("type", "friend_request")
      .eq("user_id", user.id)
      .limit(200),

    supabase
      .from("notifications")
      .select("user_id")
      .eq("type", "friend_request")
      .eq("actor_id", user.id)
      .limit(200),

    trimmedQuery
      ? supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .or(
            `display_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%`
          )
          .neq("id", user.id)
          .limit(20)
      : Promise.resolve({ data: [] }),
  ]);

  const friendIds = Array.from(
    new Set(
      (friendRows ?? []).map((row) =>
        row.user_id === user.id ? row.friend_id : row.user_id
      )
    )
  );

  const excludedIdSet = new Set([user.id, ...friendIds]);

  const incomingIds = (incomingRequestRows ?? []).map((row) => row.actor_id);
  const outgoingIds = (outgoingRequestRows ?? []).map((row) => row.user_id);

  const searchResults: ProfileRow[] =
    (searchResultsData.data as ProfileRow[]) ?? [];

  const [friendsListData, secondDegreeData] = await Promise.all([
    friendIds.length > 0
      ? supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", friendIds)
      : Promise.resolve({ data: [], error: null }),

    friendIds.length > 0
      ? supabase
          .from("friends")
          .select("user_id, friend_id")
          .or(
            `user_id.in.(${friendIds.join(",")}),friend_id.in.(${friendIds.join(",")})`
          )
          .limit(500)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const friendsList: ProfileRow[] =
    (friendsListData.data as ProfileRow[]) ?? [];

  const mutualCounts = new Map<string, number>();

  (secondDegreeData.data ?? []).forEach((row) => {
    const isConnectedToFriend =
      friendIds.includes(row.user_id) || friendIds.includes(row.friend_id);

    if (!isConnectedToFriend) return;

    const suggestedId = friendIds.includes(row.user_id)
      ? row.friend_id
      : row.user_id;

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

    suggestedFriends = Array.from(
      new Map(
        ((suggestedProfiles ?? []) as ProfileRow[]).map((profile) => [
          profile.id,
          {
            ...profile,
            mutualCount: mutualCounts.get(profile.id) ?? 0,
          },
        ])
      ).values()
    ).sort((a, b) => b.mutualCount - a.mutualCount);
  }

  console.log("FRIENDS PAGE DEBUG");
  console.log("user.id:", user.id);
  console.log("raw friendRows:", friendRows);
  console.log("derived friendIds:", friendIds);
  console.log("friendsListData:", friendsListData.data);
  console.log("friendsListError:", friendsListData.error);
  console.log("secondDegreeData:", secondDegreeData.data);
  console.log("secondDegreeError:", secondDegreeData.error);
  console.log("friendsList:", friendsList);
  console.log("incomingIds:", incomingIds);
  console.log("outgoingIds:", outgoingIds);
  console.log("suggestedFriends:", suggestedFriends);

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
                  friendIds={friendIds}
                  outgoingIds={outgoingIds}
                  incomingIds={incomingIds}
                  mutualCount={profile.mutualCount}
                  onAddFriend={addFriend}
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
                  friendIds={friendIds}
                  outgoingIds={outgoingIds}
                  incomingIds={incomingIds}
                  onAddFriend={addFriend}
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
                  <InitialAvatar
                    name={friend.display_name}
                    avatarUrl={friend.avatar_url}
                  />
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
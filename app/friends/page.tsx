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

  const { data: existing } = await supabase
    .from("friends")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("friend_id", friendId)
    .maybeSingle();

  if (existing) {
    redirect("/friends");
  }

  const { error } = await supabase.from("friends").insert({
    user_id: user.id,
    friend_id: friendId,
  });

  if (error) {
    console.error("Error adding friend:", error);
    throw new Error("Failed to add friend");
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

  const { data: friendRows } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", user.id);

  const friendIds = friendRows?.map((row) => row.friend_id) ?? [];
  const excludedIds = [user.id, ...friendIds];

  let friendsList: ProfileRow[] = [];

  if (friendIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", friendIds);

    friendsList = profiles ?? [];
  }

  let searchResults: ProfileRow[] = [];

  if (q.trim()) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .ilike("display_name", `%${q}%`)
      .neq("id", user.id)
      .limit(20);

    searchResults =
      profiles?.filter((profile) => !friendIds.includes(profile.id)) ?? [];
  }

  let suggestedFriends: SuggestedFriend[] = [];

  if (friendIds.length > 0) {
    const { data: secondDegreeRows } = await supabase
      .from("friends")
      .select("user_id, friend_id")
      .in("user_id", friendIds);

    const mutualCounts = new Map<string, number>();

    (secondDegreeRows ?? []).forEach((row) => {
      const suggestedId = row.friend_id;

      if (excludedIds.includes(suggestedId)) {
        return;
      }

      mutualCounts.set(suggestedId, (mutualCounts.get(suggestedId) ?? 0) + 1);
    });

    const suggestedIds = Array.from(mutualCounts.keys());

    if (suggestedIds.length > 0) {
      const { data: suggestedProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", suggestedIds);

      suggestedFriends = (suggestedProfiles ?? [])
        .map((profile) => ({
          ...profile,
          mutualCount: mutualCounts.get(profile.id) ?? 0,
        }))
        .sort((a, b) => b.mutualCount - a.mutualCount);
    }
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
            placeholder="Search display names..."
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
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                    <Link
                    href={`/user/${profile.id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition"
                    >
                    <InitialAvatar name={profile.display_name} />

                    <div>
                        <p className="font-medium">
                        {profile.display_name || "Unnamed user"}
                        </p>
                        <p className="text-sm text-white/50">
                        {profile.mutualCount} mutual{" "}
                        {profile.mutualCount === 1 ? "friend" : "friends"}
                        </p>
                    </div>
                    </Link>

                  <form action={addFriend}>
                    <input type="hidden" name="friend_id" value={profile.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
                    >
                      Add Friend
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 text-xl font-semibold">Search Results</h2>

          {!q.trim() ? (
            <p className="text-sm text-white/50">Search for a friend above.</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-white/50">No users found.</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <div className="flex items-center gap-3">
                    <InitialAvatar name={profile.display_name} />

                    <p className="font-medium">
                      {profile.display_name || "Unnamed user"}
                    </p>
                  </div>

                  <form action={addFriend}>
                    <input type="hidden" name="friend_id" value={profile.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
                    >
                      Add Friend
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold">Your Friends</h2>

          {friendsList.length === 0 ? (
            <p className="text-sm text-white/50">
              You haven’t added any friends yet.
            </p>
          ) : (
            <div className="space-y-3">
              {friendsList.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/user/${friend.id}`}
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
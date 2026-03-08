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

  if (!friendId || friendId === user.id) return;

  // Check if friendship already exists
  const { data: existing } = await supabase
    .from("friends")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("friend_id", friendId)
    .maybeSingle();

  if (existing) return;

  // Insert both directions so friendship is mutual
  const { error } = await supabase.from("friends").insert([
    { user_id: user.id, friend_id: friendId },
    { user_id: friendId, friend_id: user.id },
  ]);

  if (error) {
    console.error("Error adding friend:", error);
  }

  redirect("/friends");
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

  // Get current user's friends
  const { data: friendRows } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", user.id);

  const friendIds = friendRows?.map((row) => row.friend_id) ?? [];

  // Load friend profiles
  let friendsList: { id: string; display_name: string | null }[] = [];

  if (friendIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", friendIds);

    friendsList = profiles ?? [];
  }

  // Search users by display name
  let searchResults: { id: string; display_name: string | null }[] = [];

  if (q.trim()) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `%${q}%`)
      .neq("id", user.id)
      .limit(20);

    searchResults =
      profiles?.filter((profile) => !friendIds.includes(profile.id)) ?? [];
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
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
            className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black transition"
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
            className="rounded-xl bg-white px-5 py-3 text-black font-medium hover:opacity-90 transition"
          >
            Search
          </button>
        </form>

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
                  <div>
                    <p className="font-medium">
                      {profile.display_name || "Unnamed user"}
                    </p>
                  </div>

                  <form action={addFriend}>
                    <input type="hidden" name="friend_id" value={profile.id} />
                    <button
                      type="submit"
                      className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black transition"
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
                <div
                  key={friend.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
                >
                  <p className="font-medium">
                    {friend.display_name || "Unnamed user"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
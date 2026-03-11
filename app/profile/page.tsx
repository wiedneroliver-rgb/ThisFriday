import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/server";
import ProfilePhotoUpload from "@/components/ProfilePhotoUpload";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Profile must be fetched first to guard onboarding redirect
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.display_name || !profile?.username) {
    redirect("/onboarding");
  }

  // Fetch friend IDs, then profiles in two rounds (IDs required before profiles)
  const { data: friendRows } = await supabase
    .from("friends")
    .select("friend_id")
    .eq("user_id", user.id)
    .limit(500);

  const friendIds = (friendRows ?? []).map((row) => row.friend_id);

  const { data: friendProfiles } =
    friendIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", friendIds)
      : { data: [] };

  const friends = (friendProfiles ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[];

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Your Profile</h1>
            <p className="mt-2 text-sm text-white/70">
              Manage your photo and profile details.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Back
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/60">Display Name</p>
          <p className="mt-2 text-xl font-medium text-white">
            {profile.display_name}
          </p>

          <p className="mt-4 text-sm text-white/60">Username</p>
          <p className="mt-2 text-lg font-medium text-white">
            @{profile.username}
          </p>
        </div>

        <ProfilePhotoUpload
          userId={user.id}
          currentAvatarUrl={profile.avatar_url ?? null}
        />

        {/* Friends section */}
        <section className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Your Friends</h2>
            <span className="text-sm text-white/50">
              {friends.length} {friends.length === 1 ? "friend" : "friends"}
            </span>
          </div>

          {friends.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center">
              <p className="text-sm text-white/50">No friends yet.</p>
              <Link
                href="/friends"
                className="mt-3 inline-block rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
              >
                Find Friends
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <Link
                  key={friend.id}
                  href={`/user/${friend.id}?from=/profile`}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-medium text-white">
                    {(friend.display_name || friend.username || "U")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {friend.display_name || "Unnamed user"}
                    </p>
                    {friend.username && (
                      <p className="text-xs text-white/50">@{friend.username}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
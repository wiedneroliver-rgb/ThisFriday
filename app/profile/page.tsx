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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.display_name || !profile?.username) {
    redirect("/onboarding");
  }

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
      </div>
    </main>
  );
}
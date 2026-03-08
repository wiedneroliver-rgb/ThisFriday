import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading notifications:", error);
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Notifications</h1>

          <Link
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 hover:bg-white/5"
          >
            Back
          </Link>
        </div>

        {!notifications || notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Link
                key={notification.id}
                href={
                  notification.event_id
                    ? `/events/${notification.event_id}`
                    : "/"
                }
                className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
              >
                <p className="text-sm font-medium text-white">
                  {notification.message}
                </p>

                <p className="mt-2 text-xs text-white/50">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
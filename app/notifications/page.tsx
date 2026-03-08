import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";

async function acceptFriendRequest(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notificationId = Number(formData.get("notification_id"));
  const actorId = formData.get("actor_id") as string;

  if (!notificationId || !actorId || actorId === user.id) {
    redirect("/notifications");
  }

  const { data: existingRows } = await supabase
    .from("friends")
    .select("user_id, friend_id")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${actorId}),and(user_id.eq.${actorId},friend_id.eq.${user.id})`
    );

  const alreadyHasForward = (existingRows ?? []).some(
    (row) => row.user_id === user.id && row.friend_id === actorId
  );

  const alreadyHasReverse = (existingRows ?? []).some(
    (row) => row.user_id === actorId && row.friend_id === user.id
  );

  const rowsToInsert = [];

  if (!alreadyHasForward) {
    rowsToInsert.push({
      user_id: user.id,
      friend_id: actorId,
    });
  }

  if (!alreadyHasReverse) {
    rowsToInsert.push({
      user_id: actorId,
      friend_id: user.id,
    });
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("friends")
      .insert(rowsToInsert);

    if (insertError) {
      console.error("Error accepting friend request:", insertError);
      throw new Error("Failed to accept friend request");
    }
  }

  const { error: deleteError } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .eq("type", "friend_request");

  if (deleteError) {
    console.error("Error removing friend request notification:", deleteError);
    throw new Error("Failed to finish friend request");
  }

  redirect("/notifications");
}

async function declineFriendRequest(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const notificationId = Number(formData.get("notification_id"));

  if (!notificationId) {
    redirect("/notifications");
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .eq("type", "friend_request");

  if (error) {
    console.error("Error declining friend request:", error);
    throw new Error("Failed to decline friend request");
  }

  redirect("/notifications");
}

export default async function NotificationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

    await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);

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

            <a
            href="/"
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:border-white/40 hover:bg-white/5"
            >
            Back
            </a>
        </div>

        {!notifications || notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            No notifications yet.
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) =>
              notification.type === "friend_request" ? (
                <div
                  key={notification.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-sm font-medium text-white">
                    {notification.message}
                  </p>

                  <p className="mt-2 text-xs text-white/50">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>

                  <div className="mt-4 flex gap-3">
                    <form action={acceptFriendRequest}>
                      <input
                        type="hidden"
                        name="notification_id"
                        value={notification.id}
                      />
                      <input
                        type="hidden"
                        name="actor_id"
                        value={notification.actor_id}
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
                      >
                        Accept
                      </button>
                    </form>

                    <form action={declineFriendRequest}>
                      <input
                        type="hidden"
                        name="notification_id"
                        value={notification.id}
                      />
                      <button
                        type="submit"
                        className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white hover:text-black"
                      >
                        Decline
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
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
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
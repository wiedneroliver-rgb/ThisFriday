import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";
import UserAvatar from "@/components/UserAvatar";
import { revalidatePath } from "next/cache";

type Notification = {
  id: number;
  actor_id: string;
  event_id: number | null;
  scene_id: string | null;
  type: string;
  message: string | null;
  created_at: string;
  read: boolean;
};

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

  const { error } = await supabase.rpc("accept_friend_request", {
    p_notification_id: notificationId,
    p_actor_id: actorId,
  });

  if (error) {
    console.error("Error accepting friend request:", error);
    throw new Error("Failed to accept friend request");
  }

  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath("/friends");

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

  revalidatePath("/notifications");
  revalidatePath("/");

  redirect("/notifications");
}

async function goToEventFromNotification(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const eventId = Number(formData.get("event_id"));
  const notificationId = Number(formData.get("notification_id"));

  if (!eventId) {
    redirect("/notifications");
  }

  const { error } = await supabase.from("going").insert({
    user_id: user.id,
    event_id: eventId,
  });

  if (error && error.code !== "23505") {
    console.error("Error RSVP'ing from notification:", error);
    throw new Error("Failed to RSVP to event");
  }

  // Delete the invite notification after responding
  if (notificationId) {
    await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);
  }

  revalidatePath("/notifications");
  revalidatePath("/");
  revalidatePath(`/events/${eventId}`);

  redirect(`/events/${eventId}`);
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString();
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

  // Explicit column select + limit to prevent unbounded growth over time
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("id, actor_id, event_id, scene_id, type, message, created_at, read")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error loading notifications:", error);
  }

  const actorIds = Array.from(
    new Set(
      (notifications ?? []).map((n: Notification) => n.actor_id).filter(Boolean)
    )
  );

  const eventIds = Array.from(
    new Set(
      (notifications ?? [])
        .map((n: Notification) => n.event_id)
        .filter(Boolean)
    )
  );

  const { data: actorProfiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", actorIds)
    : { data: [] };

  const { data: events } = eventIds.length
    ? await supabase.from("events").select("id, title").in("id", eventIds)
    : { data: [] };

  const actorMap = new Map(
    (actorProfiles ?? []).map((profile) => [String(profile.id), profile])
  );

  const eventMap = new Map((events ?? []).map((event) => [event.id, event]));

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
            {notifications.map((notification: Notification) => {
              const actor = actorMap.get(String(notification.actor_id));
              const event = notification.event_id
                ? eventMap.get(notification.event_id)
                : null;

              const actorName = actor?.display_name || "Someone";
              const safeType = notification.type?.trim() ?? "";

              // Use stored message — always present for notifications created by the app
              const message =
                notification.message?.trim() ||
                `${actorName} sent you a notification`;

              if (safeType === "friend_request") {
                return (
                  <div
                    key={notification.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        src={actor?.avatar_url}
                        fallback={actorName}
                        size="h-11 w-11"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {message}
                        </p>

                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Friend Request
                        </p>

                        <p className="mt-3 text-xs text-white/50">
                          {formatTimestamp(notification.created_at)}
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
                    </div>
                  </div>
                );
              }

              if (safeType === "event_invite") {
                return (
                  <div
                    key={notification.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        src={actor?.avatar_url}
                        fallback={actorName}
                        size="h-11 w-11"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {message}
                        </p>

                        <p className="mt-3 text-xs text-white/50">
                          {formatTimestamp(notification.created_at)}
                        </p>

                        <div className="mt-4 flex gap-3">
                          <form action={goToEventFromNotification}>
                            <input
                              type="hidden"
                              name="event_id"
                              value={notification.event_id ?? ""}
                            />
                            <input
                              type="hidden"
                              name="notification_id"
                              value={notification.id}
                            />
                            <button
                              type="submit"
                              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
                            >
                              I'm Going
                            </button>
                          </form>

                          <Link
                            href={`/events/${notification.event_id}`}
                            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition hover:bg-white hover:text-black"
                          >
                            View Event
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              if (safeType === "scene_invite") {
                return (
                  <div
                    key={notification.id}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <UserAvatar
                        src={actor?.avatar_url}
                        fallback={actorName}
                        size="h-11 w-11"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">
                          {message}
                        </p>

                        <p className="mt-3 text-xs text-white/50">
                          {formatTimestamp(notification.created_at)}
                        </p>

                        <div className="mt-4 flex gap-3">
                          <Link
                            href={`/scene/${notification.scene_id}`}
                            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
                          >
                            View Invite
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <Link
                  key={notification.id}
                  href={
                    notification.event_id
                      ? `/events/${notification.event_id}?from=notifications`
                      : "/"
                  }
                  className="block rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      src={actor?.avatar_url}
                      fallback={actorName}
                      size="h-11 w-11"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white">
                        {message}
                      </p>

                      {event?.title && (
                        <p className="mt-1 text-sm text-zinc-400">
                          Tap to view event details
                        </p>
                      )}

                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        Activity
                      </p>

                      <p className="mt-3 text-xs text-white/50">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
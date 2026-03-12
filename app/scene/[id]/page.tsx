import { createClient } from "@/lib/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SceneEventPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event }, { data: guestRows }] = await Promise.all([
    supabase
      .from("hosted_events")
      .select("id, host_id, title, location, date")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("hosted_event_guests")
      .select("user_id, status")
      .eq("hosted_event_id", id)
      .in("status", ["invited", "accepted"]),
  ]);

  if (!event) notFound();

  const isHost = event.host_id === user.id;
  const currentGuest = guestRows?.find((g) => g.user_id === user.id);

  if (!isHost && !currentGuest) notFound();

  const guestIds = (guestRows ?? []).map((g) => g.user_id);

  const { data: guestProfiles } =
    guestIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, username")
          .in("id", guestIds)
      : { data: [] };

  const { data: hostProfile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", event.host_id)
    .maybeSingle();

  const profileMap = new Map((guestProfiles ?? []).map((p) => [p.id, p]));

  const acceptedGuests = (guestRows ?? []).filter(
    (g) => g.status === "accepted"
  );
  const pendingGuests = (guestRows ?? []).filter((g) => g.status === "invited");

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-md border-x border-white/10 bg-black px-4 pb-12">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="py-4">
            <Link
              href="/"
              className="inline-block text-sm text-zinc-400 transition hover:text-white"
            >
              ← Back
            </Link>

            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  Your Scene
                </p>
                <h1 className="mt-1 text-2xl font-bold">{event.title}</h1>
                <p className="mt-1 text-sm text-white/60">{event.location}</p>
                <p className="mt-0.5 text-sm text-white/40">
                  {formattedDate} at {formattedTime}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  Hosted by{" "}
                  {hostProfile?.display_name ||
                    hostProfile?.username ||
                    "Unknown"}
                </p>
              </div>

              {isHost && (
                <Link
                  href={`/scene/${id}/edit`}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
                >
                  Edit
                </Link>
              )}
            </div>
          </div>
        </header>

        {!isHost && currentGuest?.status === "invited" && (
          <section className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4">
            <p className="text-sm font-medium">You've been invited!</p>
            <p className="mt-1 text-xs text-white/50">
              Will you be going to {event.title}?
            </p>
            <div className="mt-4 flex gap-3">
              <form action={`/scene/${id}/respond`} method="POST">
                <input type="hidden" name="status" value="accepted" />
                <button
                  type="submit"
                  className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition hover:opacity-90"
                >
                  Accept
                </button>
              </form>
              <form action={`/scene/${id}/respond`} method="POST">
                <input type="hidden" name="status" value="declined" />
                <button
                  type="submit"
                  className="rounded-full border border-white/20 px-5 py-2 text-sm transition hover:bg-white/10"
                >
                  Decline
                </button>
              </form>
            </div>
          </section>
        )}

        {!isHost && currentGuest?.status === "accepted" && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-white/80">✓ You're going to this event</p>
            <p className="mt-1 text-xs text-white/50">
              Plans changed? You can leave this event.
            </p>

            <div className="mt-4">
              <form action="/" method="GET">
                <button
                    formAction={`/scene/${id}/respond`}
                    formMethod="POST"
                    name="status"
                    value="declined"
                    type="submit"
                    className="rounded-full border border-white/20 px-5 py-2 text-sm transition hover:bg-white hover:text-black"
                >
                  Leave Event
                </button>
              </form>
            </div>
          </section>
        )}

        <section className="mt-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Guest List
              </p>
              <p className="text-xs text-white/40">
                {acceptedGuests.length} going
                {pendingGuests.length > 0 && `, ${pendingGuests.length} pending`}
              </p>
            </div>

            {acceptedGuests.length === 0 && pendingGuests.length === 0 ? (
              <p className="mt-4 text-sm text-white/40">No guests yet.</p>
            ) : (
              <div className="mt-4 space-y-2">
                {acceptedGuests.map((guest) => {
                  const profile = profileMap.get(guest.user_id);
                  return (
                    <div
                      key={guest.user_id}
                      className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                        {(profile?.display_name || profile?.username || "U")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {profile?.display_name || "Unnamed"}
                        </p>
                      </div>
                      <span className="text-xs text-white/40">Going</span>
                    </div>
                  );
                })}

                {pendingGuests.map((guest) => {
                  const profile = profileMap.get(guest.user_id);
                  return (
                    <div
                      key={guest.user_id}
                      className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 opacity-50"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
                        {(profile?.display_name || profile?.username || "U")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {profile?.display_name || "Unnamed"}
                        </p>
                      </div>
                      <span className="text-xs text-white/40">Pending</span>
                    </div>
                  );
                })}
              </div>
            )}

            {isHost && (
              <Link
                href={`/scene/${id}/invite`}
                className="mt-4 flex w-full items-center justify-center rounded-xl border border-white/10 py-2.5 text-sm text-white/60 transition hover:border-white/30 hover:text-white"
              >
                + Invite More Friends
              </Link>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
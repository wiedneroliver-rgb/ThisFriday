import { createClient } from "@/lib/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function updateEvent(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("event_id") as string;
  const title = formData.get("title") as string;
  const location = formData.get("location") as string;
  const date = formData.get("date") as string;
  const time = formData.get("time") as string;

  const dateTime = new Date(`${date}T${time}`).toISOString();

  await supabase
    .from("hosted_events")
    .update({ title, location, date: dateTime })
    .eq("id", id)
    .eq("host_id", user.id);

  // Notify all accepted guests of the update
  const { data: guestRows } = await supabase
    .from("hosted_event_guests")
    .select("user_id")
    .eq("hosted_event_id", id)
    .eq("status", "accepted");

  const guestIds = (guestRows ?? []).map((g) => g.user_id);

  if (guestIds.length > 0) {
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const hostName =
      hostProfile?.display_name?.trim() ||
      hostProfile?.username?.trim() ||
      "Your host";

    await supabase.from("notifications").insert(
      guestIds.map((userId) => ({
        user_id: userId,
        type: "event_updated",
        actor_id: user.id,
        event_id: id,
        message: `${hostName} updated the details for ${title}`,
        read: false,
      }))
    );
  }

  redirect(`/scene/${id}`);
}

async function cancelEvent(formData: FormData) {
  "use server";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = formData.get("event_id") as string;

  // Get event title and accepted guests before deleting
  const [{ data: event }, { data: guestRows }] = await Promise.all([
    supabase
      .from("hosted_events")
      .select("title")
      .eq("id", id)
      .eq("host_id", user.id)
      .maybeSingle(),
    supabase
      .from("hosted_event_guests")
      .select("user_id")
      .eq("hosted_event_id", id)
      .eq("status", "accepted"),
  ]);

  if (!event) redirect("/");

  const guestIds = (guestRows ?? []).map((g) => g.user_id);

  // Notify accepted guests of cancellation
  if (guestIds.length > 0) {
    const { data: hostProfile } = await supabase
      .from("profiles")
      .select("display_name, username")
      .eq("id", user.id)
      .maybeSingle();

    const hostName =
      hostProfile?.display_name?.trim() ||
      hostProfile?.username?.trim() ||
      "Your host";

    await supabase.from("notifications").insert(
      guestIds.map((userId) => ({
        user_id: userId,
        type: "event_cancelled",
        actor_id: user.id,
        event_id: id,
        message: `${hostName} cancelled ${event.title}`,
        read: false,
      }))
    );
  }

  // Delete event (cascades to guests)
  await supabase
    .from("hosted_events")
    .delete()
    .eq("id", id)
    .eq("host_id", user.id);

  redirect("/");
}

export default async function EditScenePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: event } = await supabase
    .from("hosted_events")
    .select("id, host_id, title, location, date")
    .eq("id", id)
    .eq("host_id", user.id)
    .maybeSingle();

  if (!event) notFound();

  const eventDate = new Date(event.date);
  const dateValue = eventDate.toISOString().split("T")[0];
  const timeValue = eventDate.toTimeString().slice(0, 5);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Edit Event</h1>
          <Link
            href={`/scene/${id}`}
            className="rounded-full border border-white/20 px-4 py-2 text-sm transition hover:bg-white hover:text-black"
          >
            Back
          </Link>
        </div>

        <form action={updateEvent} className="space-y-4">
          <input type="hidden" name="event_id" value={id} />

          <div>
            <label className="mb-1.5 block text-sm text-white/60">
              Event Title
            </label>
            <input
              type="text"
              name="title"
              defaultValue={event.title}
              required
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm text-white/60">
              Location
            </label>
            <input
              type="text"
              name="location"
              defaultValue={event.location}
              required
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm text-white/60">Date</label>
              <input
                type="date"
                name="date"
                defaultValue={dateValue}
                required
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-white/60">Time</label>
              <input
                type="time"
                name="time"
                defaultValue={timeValue}
                required
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/40"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-full bg-white py-3 font-medium text-black transition hover:opacity-90"
          >
            Save Changes
          </button>
        </form>

        {/* Cancel event */}
        <div className="mt-10 border-t border-white/10 pt-8">
          <p className="mb-3 text-sm text-white/50">Danger Zone</p>
          <form action={cancelEvent}>
            <input type="hidden" name="event_id" value={id} />
            <button
              type="submit"
              className="w-full rounded-full border border-red-500/30 py-3 text-sm text-red-400 transition hover:border-red-500 hover:bg-red-500/10"
            >
              Cancel Event
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
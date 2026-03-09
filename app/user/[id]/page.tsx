import { createClient } from "@/lib/server";
import Link from "next/link";
import { notFound } from "next/navigation";

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", id)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: goingRows } = await supabase
    .from("going")
    .select("event_id")
    .eq("user_id", id);

  const eventIds = (goingRows ?? []).map((row) => row.event_id);

  const { data: events } = eventIds.length
    ? await supabase
        .from("events")
        .select("id, title, venue, date")
        .in("id", eventIds)
        .order("date", { ascending: true })
    : { data: [] };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen max-w-md border-x border-white/10 bg-black px-4 pb-12">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-black/90 backdrop-blur">
          <div className="space-y-2 py-4">
            <Link
              href="/"
              className="inline-block text-sm text-zinc-400 transition hover:text-white"
            >
              ← Back
            </Link>

            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
              Profile
            </p>

            <h1 className="text-2xl font-bold tracking-tight">
              {profile.display_name || "User"}
            </h1>

            {profile.username && (
              <p className="text-sm text-zinc-500">@{profile.username}</p>
            )}
          </div>
        </header>

        <section className="pt-6">
          <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Weekend Plans
            </p>

            {events && events.length > 0 ? (
              <div className="mt-4 space-y-3">
                {events.map((event) => (
                  <Link
                    key={event.id}
                    href={`/events/${event.id}`}
                    className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                  >
                    <p className="text-sm text-zinc-200">{event.title}</p>
                    <p className="text-xs text-zinc-400">{event.venue}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-zinc-400">No events yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
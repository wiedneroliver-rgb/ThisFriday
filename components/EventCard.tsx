import Link from "next/link";
import GoingButton from "@/components/GoingButton";
import UserAvatar from "@/components/UserAvatar";

type Event = {
  id: number;
  title: string;
  venue: string;
  description: string | null;
  date: string;
  start_time: string;
  poster_url?: string | null;
};

type FriendPreview = {
  name: string;
  avatar: string | null;
};

type EventCardProps = {
  event: Event;
  goingCount: number;
  initialGoing: boolean;
  friendPreviews?: FriendPreview[];
};

function formatEventDate(date: string, time: string) {
  const eventDate = new Date(`${date}T${time}`);
  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);

  const timeLabel = eventDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (eventDay.getTime() === today.getTime()) {
    return `Today • ${timeLabel}`;
  }

  if (eventDay.getTime() === tomorrow.getTime()) {
    return `Tomorrow • ${timeLabel}`;
  }

  const dayLabel = eventDate.toLocaleDateString([], {
    weekday: "long",
  });

  return `${dayLabel} • ${timeLabel}`;
}

function getFriendLabel(friendPreviews: FriendPreview[]) {
  if (friendPreviews.length === 1) {
    return `${friendPreviews[0].name} is going`;
  }

  if (friendPreviews.length === 2) {
    return `${friendPreviews[0].name} and ${friendPreviews[1].name} are going`;
  }

  if (friendPreviews.length === 3) {
    return `${friendPreviews[0].name}, ${friendPreviews[1].name}, and 1 other friend are going`;
  }

  return `${friendPreviews[0].name}, ${friendPreviews[1].name}, and ${
    friendPreviews.length - 2
  } other friends are going`;
}

export default function EventCard({
  event,
  goingCount,
  initialGoing,
  friendPreviews = [],
}: EventCardProps) {
  const hasPoster = Boolean(event.poster_url);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/5">
      {hasPoster && (
        <>
          <div className="absolute inset-0">
            <img
              src={event.poster_url!}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="absolute inset-0 bg-black/35" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/45 to-black/85" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%)]" />
        </>
      )}

      <div className="relative z-10 flex min-h-[260px] flex-col justify-between p-5">
        <div>
          <h3 className="text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl">
            {event.title}
          </h3>

          <div className="-ml-5 mt-2">
            <div className="inline-flex items-center rounded-r-full border-y border-r border-white/10 bg-black/45 px-5 py-2 text-sm text-white backdrop-blur-sm">
              {event.venue}
            </div>
          </div>

          <p
            className={`mt-1 text-sm ${
              hasPoster ? "text-zinc-300" : "text-zinc-500"
            }`}
          >
            {formatEventDate(event.date, event.start_time)}
          </p>

          <div className="mt-4">
            <Link
              href={`/events/${event.id}`}
              className={`text-sm font-medium underline-offset-4 transition hover:underline ${
                hasPoster ? "text-zinc-100 hover:text-white" : "text-zinc-300 hover:text-white"
              }`}
            >
              View details
            </Link>
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p
                className={`text-sm ${
                  hasPoster ? "text-zinc-200" : "text-zinc-400"
                }`}
              >
                {goingCount} {goingCount === 1 ? "person" : "people"} going
              </p>

              {friendPreviews.length > 0 && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex -space-x-2">
                    {friendPreviews.slice(0, 3).map((friend, index) => (
                      <UserAvatar
                        key={`${friend.name}-${index}`}
                        src={friend.avatar}
                        fallback={friend.name}
                        size="h-7 w-7"
                      />
                    ))}

                    {friendPreviews.length > 3 && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/60 text-[10px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
                        +{friendPreviews.length - 3}
                      </div>
                    )}
                  </div>

                  <p
                    className={`line-clamp-1 text-xs ${
                      hasPoster ? "text-zinc-200" : "text-zinc-400"
                    }`}
                  >
                    {getFriendLabel(friendPreviews)}
                  </p>
                </div>
              )}
            </div>

            <div className="shrink-0">
              <GoingButton eventId={event.id} initialGoing={initialGoing} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
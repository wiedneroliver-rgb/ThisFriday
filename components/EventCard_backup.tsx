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
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-4 sm:p-5">
      <div className="space-y-2">
        <h3 className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
          {event.title}
        </h3>

        <p className="text-base text-zinc-400 sm:text-lg">{event.venue}</p>

        <p className="text-sm text-zinc-500 sm:text-base">
          {formatEventDate(event.date, event.start_time)}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-4">
        <details className="group">
          <summary className="cursor-pointer list-none text-base text-zinc-400 transition hover:text-white">
            More info{" "}
            <span className="inline-block transition group-open:rotate-180">
              ↓
            </span>
          </summary>

          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            {event.description || "No description yet."}
          </p>
        </details>

        <Link
          href={`/events/${event.id}`}
          className="text-sm font-medium text-zinc-300 underline-offset-4 transition hover:text-white hover:underline"
        >
          View details
        </Link>
      </div>

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg text-zinc-400 sm:text-xl">
              {goingCount} {goingCount === 1 ? "person" : "people"} going
            </p>

            {friendPreviews.length > 0 && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {friendPreviews.slice(0, 3).map((friend, index) => (
                    <UserAvatar
                      key={`${friend.name}-${index}`}
                      src={friend.avatar}
                      fallback={friend.name}
                      size="h-8 w-8"
                    />
                  ))}

                  {friendPreviews.length > 3 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-[10px] font-medium text-white">
                      +{friendPreviews.length - 3}
                    </div>
                  )}
                </div>

                <p className="line-clamp-2 text-xs text-zinc-400 sm:text-sm">
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
  );
}
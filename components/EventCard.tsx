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
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
      <h3 className="text-3xl font-semibold tracking-tight text-white">
        {event.title}
      </h3>

      <p className="mt-3 text-lg text-zinc-400">{event.venue}</p>

      <p className="mt-6 text-lg text-zinc-500">
        {formatEventDate(event.date, event.start_time)}
      </p>

      <div className="mt-8 flex items-center gap-4">
        <details className="group">
          <summary className="cursor-pointer list-none text-xl text-zinc-400">
            More info{" "}
            <span className="inline-block transition group-open:rotate-180">
              ↓
            </span>
          </summary>

          <p className="mt-4 text-base leading-7 text-zinc-400">
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

      <div className="mt-8 border-t border-white/10 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl text-zinc-400">{goingCount} people going</p>

            {friendPreviews.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {friendPreviews.slice(0, 3).map((friend, index) => (
                    <UserAvatar
                      key={`${friend.name}-${index}`}
                      src={friend.avatar}
                      fallback={friend.name}
                      size="h-9 w-9"
                    />
                  ))}

                  {friendPreviews.length > 3 && (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-xs font-medium text-white">
                      +{friendPreviews.length - 3}
                    </div>
                  )}
                </div>

                <p className="text-sm text-zinc-400">
                  {getFriendLabel(friendPreviews)}
                </p>
              </div>
            )}
          </div>

          <GoingButton eventId={event.id} initialGoing={initialGoing} />
        </div>
      </div>
    </div>
  );
}
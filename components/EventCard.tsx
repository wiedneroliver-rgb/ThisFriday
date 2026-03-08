import GoingButton from "@/components/GoingButton";

type Event = {
  id: number;
  title: string;
  venue: string;
  description: string;
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
  friendIds?: FriendPreview[];
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

function getFriendLabel(friendIds: FriendPreview[]) {
  if (friendIds.length === 1) {
    return `${friendIds[0].name} is going`;
  }

  if (friendIds.length === 2) {
    return `${friendIds[0].name} and ${friendIds[1].name} are going`;
  }

  return `${friendIds.length} friends going`;
}

export default function EventCard({
  event,
  goingCount,
  initialGoing,
  friendIds = [],
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

      <div className="mt-8">
        <details className="group">
          <summary className="cursor-pointer list-none text-xl text-zinc-400">
            More info{" "}
            <span className="inline-block transition group-open:rotate-180">
              ↓
            </span>
          </summary>

          <p className="mt-4 text-base leading-7 text-zinc-400">
            {event.description}
          </p>
        </details>
      </div>

      <div className="mt-8 border-t border-white/10 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl text-zinc-400">{goingCount} people going</p>

            {friendIds.length > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {friendIds.slice(0, 4).map((friend, index) => (
                    <div
                      key={`${friend.name}-${index}`}
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-950 bg-white/10 text-xs font-medium text-white"
                      title={friend.name}
                    >
                      {friend.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={friend.avatar}
                          alt={friend.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        friend.name.charAt(0).toUpperCase()
                      )}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-zinc-400">
                  {getFriendLabel(friendIds)}
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
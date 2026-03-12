import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";

type FriendPreview = {
  name: string;
  avatar: string | null;
};

type SceneEvent = {
  id: string;
  title: string;
  location: string;
  date: string;
};

type SceneCardProps = {
  event: SceneEvent;
  isHosting: boolean;
  goingCount: number;
  pendingCount: number;
  friendPreviews?: FriendPreview[];
};

function formatSceneDate(date: string) {
  const eventDate = new Date(date);
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
    return `${friendPreviews[0].name}, ${friendPreviews[1].name}, and 1 other person are going`;
  }

  return `${friendPreviews[0].name}, ${friendPreviews[1].name}, and ${
    friendPreviews.length - 2
  } other people are going`;
}

export default function SceneCard({
  event,
  isHosting,
  goingCount,
  pendingCount,
  friendPreviews = [],
}: SceneCardProps) {
  return (
    <Link
      href={`/scene/${event.id}`}
      className="block rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold leading-tight tracking-tight text-white sm:text-2xl">
            {event.title}
          </h3>

          <p className="mt-1 truncate text-sm text-zinc-400 sm:text-base">
            {event.location}
          </p>

          <p className="mt-1 text-sm text-zinc-500">
            {formatSceneDate(event.date)}
          </p>
        </div>

        {isHosting && (
          <span className="shrink-0 rounded-full border border-white/15 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-zinc-400">
            Hosting
          </span>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <p className="text-sm text-zinc-400">
            {goingCount} going
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
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
                  <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-zinc-900 text-[10px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    +{friendPreviews.length - 3}
                  </div>
                )}
              </div>

              <p className="line-clamp-1 text-xs text-zinc-400">
                {getFriendLabel(friendPreviews)}
              </p>
            </div>
          )}
        </div>

        <span className="shrink-0 text-sm font-medium text-zinc-300">
          View
        </span>
      </div>
    </Link>
  );
}
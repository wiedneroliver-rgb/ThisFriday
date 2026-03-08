import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";

type FriendFeedItem = {
  id: string;
  friendId: string;
  friendName: string;
  friendAvatar: string | null;
  eventTitle: string;
  venue: string;
  eventDate: string;
  eventTime: string;
  createdAt: string;
};

function formatEventDay(eventDate: string) {
  if (!eventDate) return "this weekend";

  const date = new Date(eventDate);

  const now = new Date();

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);

  const dateOnly = date.toDateString();
  const todayOnly = today.toDateString();
  const tomorrowOnly = tomorrow.toDateString();

  if (dateOnly === todayOnly) {
    if (now.getHours() >= 18) {
      return "Tonight";
    }
    return "Today";
  }

  if (dateOnly === tomorrowOnly) return "Tomorrow";

  return date.toLocaleDateString("en-US", {
    weekday: "long",
  });
}

export type { FriendFeedItem };

export default function FriendsActivityFeed({
  items,
}: {
  items: FriendFeedItem[];
}) {
  if (!items.length) {
    return (
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Recent Activity
        </h2>

        <p className="text-sm text-zinc-500">No recent friend activity yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
        Recent Activity
      </h2>

      <div className="space-y-4">
        {items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <Link
              href={`/user/${item.friendId}`}
              className="flex items-center gap-3 transition hover:opacity-80"
            >
              <UserAvatar
                src={item.friendAvatar}
                fallback={item.friendName}
                size="h-9 w-9"
              />

              <span className="font-medium text-white">
                {item.friendName}
              </span>
            </Link>

            <p className="text-sm leading-6 text-zinc-300">
              <span className="text-zinc-500">– </span>
              is going to{" "}
              <span className="font-medium text-white">{item.venue}</span>{" "}
              on{" "}
              <span className="text-white">
                {formatEventDay(item.eventDate)}
              </span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
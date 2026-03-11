"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/client";

export default function NotificationBell() {
  const [supabase] = useState(() => createClient());
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Skip fetch when on the notifications page itself — it marks everything
    // as read on load, so the count will be 0 anyway. This also prevents
    // firing a DB query on every single page navigation.
    if (pathname === "/notifications") {
      setCount(0);
      return;
    }

    let isMounted = true;

    async function loadUnreadCount() {
      // getSession reads from local cache — no network roundtrip
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        if (isMounted) setCount(0);
        return;
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id)
        .eq("read", false);

      if (error) {
        console.error("Error loading unread notification count:", error);
        if (isMounted) setCount(0);
        return;
      }

      if (isMounted) {
        setCount(count ?? 0);
      }
    }

    loadUnreadCount();

    return () => {
      isMounted = false;
    };
  }, [pathname, supabase]);

  return (
    <Link
      href="/notifications"
      aria-label="Notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white hover:text-black"
    >
      <Bell className="h-4 w-4" />

      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold leading-none text-black">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
"use client";

import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full rounded-full border border-white/10 bg-white/5 py-3 text-sm text-zinc-300 transition hover:bg-white hover:text-black"
    >
      Log out
    </button>
  );
}
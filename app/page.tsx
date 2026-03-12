import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="rounded-3xl border border-white/10 bg-zinc-950 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">

          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-zinc-400">
            Private Beta
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight">
            ThisFriday
          </h1>

          <p className="mt-5 text-base leading-7 text-zinc-300">
            See where your friends are going out tonight.
          </p>

          <p className="mt-2 text-base leading-7 text-zinc-400">
            Early access for Victoria students.
          </p>

          <Link
            href="/login"
            className="mt-8 flex w-full items-center justify-center rounded-full bg-white px-6 py-4 text-base font-semibold text-black transition hover:opacity-90"
          >
            Join the Beta
          </Link>

        </div>
      </div>
    </main>
  );
}
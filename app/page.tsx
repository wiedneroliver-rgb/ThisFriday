"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase";

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.replace("/feed");
      } else {
        const loginUrl = ref ? `/login?ref=${encodeURIComponent(ref)}` : "/login";
        router.replace(loginUrl);
      }
    }
    checkAuth();
  }, [router, ref]);

  return (
    <div style={{ background: "#080808", minHeight: "100vh" }} />
  );
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

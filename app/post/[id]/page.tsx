"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Deep link alias: /post/{id} → /events/{id}
export default function PostRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    if (id) router.replace(`/events/${id}`);
  }, [id, router]);

  return (
    <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(240,237,232,0.3)" }}>
      Loading...
    </div>
  );
}

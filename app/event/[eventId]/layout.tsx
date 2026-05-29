import { createClient } from "@supabase/supabase-js";

const FALLBACK = {
  title: "ThisFriday",
  description: "See what's happening tonight.",
};

export async function generateMetadata({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;

  let title = FALLBACK.title;
  let description = FALLBACK.description;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: event } = await supabase
      .from("events")
      .select("title, description")
      .eq("id", eventId)
      .single();

    if (event?.title) {
      title = event.title;
      description = event.description ?? `Check out ${event.title} on ThisFriday`;
    }
  } catch {
    // supabase unreachable — use fallback
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "https://thisfridayapp.com/logo.png", width: 1200, height: 1200 }],
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["https://thisfridayapp.com/logo.png"],
    },
  };
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

import { createClient } from "@supabase/supabase-js";

const FALLBACK = {
  title: "ThisFriday",
  description: "Add them as a friend on ThisFriday",
};

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  let title = FALLBACK.title;
  let description = FALLBACK.description;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    if (profile?.display_name) {
      title = `${profile.display_name} on ThisFriday`;
      description = `Add ${profile.display_name} as a friend`;
    }
  } catch {
    // env vars missing or Supabase unreachable — use fallback
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

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

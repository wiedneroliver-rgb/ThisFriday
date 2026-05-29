import { createClient } from "@supabase/supabase-js";
import UserPageClient from "./UserPageClient";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  let title = "ThisFriday";
  let description = "Add them as a friend on ThisFriday";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
    // use fallback
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

export default async function UserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <UserPageClient userId={userId} />;
}

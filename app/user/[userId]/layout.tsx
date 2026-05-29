import { createClient } from "@supabase/supabase-js";

export async function generateMetadata({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .single();

  const name = profile?.display_name;
  const title = name ? `${name} on ThisFriday` : "ThisFriday";
  const description = name
    ? `Add ${name} as a friend`
    : "Add them as a friend on ThisFriday";

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

import { createClient } from "@supabase/supabase-js";

export async function generateMetadata({ params }: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: scene } = await supabase
    .from("hosted_events")
    .select("title")
    .eq("id", sceneId)
    .single();

  const title = scene?.title ?? "ThisFriday";
  const description = scene?.title
    ? `You've been invited to ${scene.title}`
    : "You've been invited to a plan on ThisFriday";

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

export default function SceneLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

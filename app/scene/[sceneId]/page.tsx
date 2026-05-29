import { createClient } from "@supabase/supabase-js";
import ScenePageClient from "./ScenePageClient";

export async function generateMetadata({ params }: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await params;

  let title = "ThisFriday";
  let description = "You've been invited to a plan on ThisFriday";
  let image = "https://thisfridayapp.com/logo.png";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: scene } = await supabase
      .from("hosted_events")
      .select("title, photo_url")
      .eq("id", sceneId)
      .single();

    if (scene?.title) {
      title = scene.title;
      description = `You've been invited to ${scene.title}`;
    }
    if (scene?.photo_url) image = scene.photo_url;
  } catch {
    // use fallback
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ScenePage({ params }: { params: Promise<{ sceneId: string }> }) {
  const { sceneId } = await params;
  return <ScenePageClient sceneId={sceneId} />;
}

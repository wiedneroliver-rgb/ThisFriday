import { createClient } from "@/lib/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const formData = await request.formData();
  const status = formData.get("status") as string;

  if (status === "declined") {
    await supabase
      .from("hosted_event_guests")
      .delete()
      .eq("hosted_event_id", id)
      .eq("user_id", user.id);

    await supabase
      .from("notifications")
      .delete()
      .eq("scene_id", id)
      .eq("user_id", user.id)
      .eq("type", "scene_invite");

    revalidatePath("/");
    revalidatePath(`/scene/${id}`);

    redirect("/");
  }

  if (status === "accepted") {
    await supabase
      .from("hosted_event_guests")
      .update({ status: "accepted" })
      .eq("hosted_event_id", id)
      .eq("user_id", user.id);

    await supabase
      .from("notifications")
      .delete()
      .eq("scene_id", id)
      .eq("user_id", user.id)
      .eq("type", "scene_invite");

    revalidatePath("/");
    revalidatePath(`/scene/${id}`);

    redirect(`/scene/${id}`);
  }

  redirect("/");
}
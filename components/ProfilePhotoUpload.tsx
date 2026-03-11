"use client";

import { useState, type ChangeEvent } from "react";
import { createClient } from "@/lib/client";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  currentAvatarUrl: string | null;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function getExtensionFromType(type: string) {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "png";
  }
}

export default function ProfilePhotoUpload({
  userId,
  currentAvatarUrl,
}: Props) {
  const [supabase] = useState(() => createClient());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const router = useRouter();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setImageError(false);

    try {
      if (!ALLOWED_TYPES.has(file.type)) {
        throw new Error("Please upload a JPG, PNG, WEBP, or GIF image.");
      }

      if (file.size > MAX_FILE_SIZE) {
        throw new Error("Please upload an image under 5 MB.");
      }

      // getSession reads from local cache — no network roundtrip
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user || session.user.id !== userId) {
        throw new Error("You are not authorized to update this profile photo.");
      }

      const user = session.user;
      const fileExt = getExtensionFromType(file.type);
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      router.refresh();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to upload photo."
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <h2 className="text-lg font-semibold text-white">Profile Photo</h2>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white/10 text-xl text-white">
          {currentAvatarUrl && !imageError ? (
            <img
              src={currentAvatarUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            userId[0]?.toUpperCase()
          )}
        </div>

        <label className="inline-flex cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:opacity-90">
          {uploading ? "Uploading..." : "Upload Photo"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        JPG, PNG, WEBP, or GIF. Max 5 MB.
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
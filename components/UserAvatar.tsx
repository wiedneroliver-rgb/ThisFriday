"use client";

import { useState } from "react";

type UserAvatarProps = {
  src?: string | null;
  fallback: string;
  size?: string;
};

export default function UserAvatar({
  src,
  fallback,
  size = "h-10 w-10",
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const initial = fallback?.[0]?.toUpperCase() || "?";

  return (
    <div
      className={`flex ${size} items-center justify-center overflow-hidden rounded-full bg-white/10 text-white`}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={fallback}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-sm font-medium">{initial}</span>
      )}
    </div>
  );
}
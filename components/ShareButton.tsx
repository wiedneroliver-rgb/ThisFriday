"use client";

import { useState } from "react";

interface Props {
  url: string;
  title?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function ShareButton({ url, title, style, children }: Props) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "ThisFriday", url });
        return;
      } catch {
        // fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button onClick={share} style={style}>
      {copied ? "✓ Copied!" : (children || "Share")}
    </button>
  );
}

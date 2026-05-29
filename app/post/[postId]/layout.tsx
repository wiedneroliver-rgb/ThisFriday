export async function generateMetadata() {
  return {
    title: "ThisFriday",
    description: "See what's happening tonight.",
    openGraph: {
      title: "ThisFriday",
      description: "See what's happening tonight.",
      images: [{ url: "https://thisfridayapp.com/logo.png", width: 1200, height: 1200 }],
    },
    twitter: {
      card: "summary",
      title: "ThisFriday",
      description: "See what's happening tonight.",
      images: ["https://thisfridayapp.com/logo.png"],
    },
  };
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

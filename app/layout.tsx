import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "ThisFriday",
  description: "See what your friends are doing this weekend.",
  metadataBase: new URL("https://thisfridayapp.com"),
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/logo.png",
  },
  openGraph: {
    title: "ThisFriday",
    description: "See what your friends are doing this weekend.",
    url: "https://thisfridayapp.com",
    siteName: "ThisFriday",
    images: [{ url: "https://thisfridayapp.com/logo.png", width: 1200, height: 1200 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ThisFriday",
    description: "See what your friends are doing this weekend.",
    images: ["https://thisfridayapp.com/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: "ThisFriday",
  description: "See where your friends are going.",
  metadataBase: new URL("https://thisfridayapp.com"),
  openGraph: {
    title: "ThisFriday",
    description: "See where your friends are going.",
    url: "https://thisfridayapp.com",
    siteName: "ThisFriday",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmSans.variable}`}>
        {children}
      </body>
    </html>
  );
}

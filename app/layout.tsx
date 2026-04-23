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
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}

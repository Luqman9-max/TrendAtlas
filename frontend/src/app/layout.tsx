import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TrendAtlas — Real-Time Trend Analyzer",
  description: "Discover, analyze, and compare trending topics across GitHub, Reddit, and Google Trends in real-time.",
  keywords: ["trends", "analytics", "github", "reddit", "google trends", "dashboard"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}

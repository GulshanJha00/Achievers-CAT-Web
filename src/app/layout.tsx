import type { Metadata } from "next";
import { Sora, Inter } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ACHIEVERS CAT — Prepare smarter for CAT",
  description:
    "Daily practice, sectional and full mocks, and study materials for CAT aspirants. Track your streak, attempt CAT-pattern mocks, and download your scorecard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${inter.variable} antialiased flex min-h-screen flex-col`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

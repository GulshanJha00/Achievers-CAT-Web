"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isMockTab = usePathname().startsWith("/mock-view/");

  if (isMockTab) return <main className="flex-1">{children}</main>;

  return <>
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
  </>;
}

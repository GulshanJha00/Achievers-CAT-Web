"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Header from "./Header";
import Toast from "./Toast";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isMockTab = usePathname().startsWith("/mock-view/");

  if (isMockTab) return <><main className="flex-1">{children}</main><Toast /></>;

  return <>
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
    <Toast />
  </>;
}

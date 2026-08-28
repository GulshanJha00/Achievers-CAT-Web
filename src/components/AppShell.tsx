"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Header from "./Header";
import Toast from "./Toast";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const isMockTab = usePathname().startsWith("/mock-view/");

  useEffect(() => {
    const scrollCurrentPageToTop = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;
      const target = new URL(anchor.href, window.location.origin);
      if (target.origin !== window.location.origin || target.pathname !== window.location.pathname || target.search !== window.location.search) return;
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    document.addEventListener("click", scrollCurrentPageToTop, true);
    return () => document.removeEventListener("click", scrollCurrentPageToTop, true);
  }, []);

  if (isMockTab) return <><main className="flex-1">{children}</main><Toast /></>;

  return <>
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
    <Toast />
  </>;
}

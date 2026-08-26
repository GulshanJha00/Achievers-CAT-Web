"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Flame } from "lucide-react";
import Logo from "./Logo";

const nav = [
  { label: "Home", href: "/" },
  {
    label: "Daily Practice",
    href: "/daily",
    children: [
      { label: "Question of the Day", href: "/daily/question" },
      { label: "RC of the Day", href: "/daily/rc" },
      { label: "Daily Targets", href: "/daily/targets" },
    ],
  },
  {
    label: "Sectional Mocks",
    href: "/sectional",
    children: [
      { label: "VARC", href: "/sectional/varc" },
      { label: "DILR", href: "/sectional/dilr" },
      { label: "QA", href: "/sectional/qa" },
    ],
  },
  { label: "Full Mocks", href: "/mocks" },
  { label: "Materials", href: "/materials" },
  { label: "My Performance", href: "/performance" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="shrink-0">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((item) =>
            item.children ? (
              <div key={item.label} className="group relative">
                <button className="flex items-center gap-1 rounded-full px-3.5 py-2 text-[14px] font-medium text-foreground/80 transition hover:bg-brand-tint hover:text-brand-darker">
                  {item.label}
                  <ChevronDown size={14} className="text-muted transition group-hover:rotate-180" />
                </button>
                <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                  <div className="min-w-[190px] rounded-xl border border-border bg-white p-1.5 shadow-lg shadow-black/5">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        className="block rounded-lg px-3 py-2 text-[14px] text-foreground/80 hover:bg-brand-tint hover:text-brand-darker"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-[14px] font-medium text-foreground/80 transition hover:bg-brand-tint hover:text-brand-darker"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[13px] font-semibold text-brand-darker">
            <Flame size={14} className="text-flame" />0
          </div>
          <Link
            href="/login"
            className="rounded-full bg-brand px-4 py-2 text-[14px] font-semibold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark"
          >
            Log in
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-foreground lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <div className="border-t border-border bg-white lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            {nav.map((item) => (
              <div key={item.label} className="py-1.5">
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-2 text-[15px] font-medium text-foreground"
                >
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-3 flex flex-col border-l border-border pl-3">
                    {item.children.map((c) => (
                      <Link
                        key={c.href}
                        href={c.href}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-2 py-1.5 text-[14px] text-muted"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 block rounded-full bg-brand px-4 py-2.5 text-center text-[15px] font-semibold text-white"
            >
              Log in
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

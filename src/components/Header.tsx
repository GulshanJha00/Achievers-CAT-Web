"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, Flame, UserRound, LogOut, BarChart3, ShieldCheck } from "lucide-react";
import { onAuthStateChanged, type User } from "firebase/auth";
import Logo from "./Logo";
import { auth } from "@/lib/firebase/client";
import { getProfile } from "@/lib/firebase/profile";
import { signOutUser } from "@/lib/firebase/auth";

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
  const [accountOpen, setAccountOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser) {
        try {
          const profile = await getProfile(nextUser.uid);
          setIsAdmin(profile?.role === "admin");
        } catch {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function logout() {
    await signOutUser();
    setAccountOpen(false);
    setOpen(false);
    window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" onClick={() => setOpen(false)} className="shrink-0">
          <Logo />
        </Link>

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
                      <Link key={c.href} href={c.href} className="block rounded-lg px-3 py-2 text-[14px] text-foreground/80 hover:bg-brand-tint hover:text-brand-darker">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href} className="rounded-full px-3.5 py-2 text-[14px] font-medium text-foreground/80 transition hover:bg-brand-tint hover:text-brand-darker">
                {item.label}
              </Link>
            )
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[13px] font-semibold text-brand-darker">
            <Flame size={14} className="text-flame" />0
          </div>

          {!user ? (
            <Link href="/login" className="rounded-full bg-brand px-4 py-2 text-[14px] font-semibold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark">
              Log in
            </Link>
          ) : (
            <div className="relative" ref={accountRef}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-3 transition hover:border-brand"
                aria-label="Open account menu"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-brand-darker">
                    <UserRound size={16} />
                  </span>
                )}
                <span className="max-w-[120px] truncate text-[13px] font-semibold text-foreground">
                  {user.displayName?.split(" ")[0] || "Account"}
                </span>
                <ChevronDown size={14} className={`text-muted transition ${accountOpen ? "rotate-180" : ""}`} />
              </button>

              {accountOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-border bg-white p-2 shadow-xl shadow-black/10">
                  <div className="border-b border-border px-3 py-2.5">
                    <p className="truncate text-[14px] font-semibold text-foreground">{user.displayName || "Student"}</p>
                    <p className="truncate text-[12px] text-muted">{user.email}</p>
                  </div>
                  <Link href="/performance" onClick={() => setAccountOpen(false)} className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] text-foreground hover:bg-brand-tint">
                    <BarChart3 size={16} /> My Performance
                  </Link>
                  <Link href="/profile" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] text-foreground hover:bg-brand-tint">
                    <UserRound size={16} /> Profile
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" onClick={() => setAccountOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[13.5px] text-foreground hover:bg-brand-tint">
                      <ShieldCheck size={16} /> Admin Dashboard
                    </Link>
                  )}
                  <button onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13.5px] text-danger hover:bg-red-50">
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="rounded-lg p-2 text-foreground lg:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-white lg:hidden">
          <nav className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            {nav.map((item) => (
              <div key={item.label} className="py-1.5">
                <Link href={item.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-[15px] font-medium text-foreground">
                  {item.label}
                </Link>
                {item.children && (
                  <div className="ml-3 flex flex-col border-l border-border pl-3">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-1.5 text-[14px] text-muted">
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {user ? (
              <>
                <Link href="/performance" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-[15px] font-medium text-foreground">My Performance</Link>
                <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-[15px] font-medium text-foreground">Profile</Link>
                {isAdmin && <Link href="/admin" onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2 text-[15px] font-medium text-foreground">Admin Dashboard</Link>}
                <button onClick={logout} className="mt-2 block w-full rounded-full border border-border px-4 py-2.5 text-center text-[15px] font-semibold text-foreground">Logout</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="mt-2 block rounded-full bg-brand px-4 py-2.5 text-center text-[15px] font-semibold text-white">
                Log in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

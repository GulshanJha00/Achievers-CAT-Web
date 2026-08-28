"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { ArrowRight, CheckCircle2, Circle, Flame, Loader2, Users } from "lucide-react";

type DailyPackage = {
  published?: boolean;
  quant?: unknown[];
  varc?: { type?: string; questions?: unknown[] };
  dilr?: { questions?: unknown[] };
};
type Section = "quant" | "varc" | "dilr";
type Stats = Record<Section, number>;
type Attempts = Record<Section, { score: number; correct: number; total: number } | null>;

const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

export default function DailyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<DailyPackage | null>(null);
  const [stats, setStats] = useState<Stats>({ quant: 0, varc: 0, dilr: 0 });
  const [attempts, setAttempts] = useState<Attempts>({ quant: null, varc: null, dilr: null });
  const [loading, setLoading] = useState(true);
  const date = todayIST();

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); }), []);

  useEffect(() => {
    if (user) return;
    getDoc(doc(db, "daily_packages", date))
      .then((packageSnap) => setData(packageSnap.exists() ? packageSnap.data() as DailyPackage : null))
      .catch(console.error);
  }, [date, user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const packageSnap = await getDoc(doc(db, "daily_packages", date));
      setData(packageSnap.exists() ? packageSnap.data() as DailyPackage : null);
      const nextStats = { quant: 0, varc: 0, dilr: 0 } as Stats;
      const nextAttempts = { quant: null, varc: null, dilr: null } as Attempts;
      for (const section of ["quant", "varc", "dilr"] as Section[]) {
        const statSnap = await getDoc(doc(db, "daily_section_stats", `${date}_${section}`));
        if (statSnap.exists()) nextStats[section] = Number(statSnap.data().count || 0);
        const attemptSnap = await getDoc(doc(db, "daily_attempts", `${date}_${section}_${user.uid}`));
        if (attemptSnap.exists()) {
          const a = attemptSnap.data();
          nextAttempts[section] = { score: Number(a.score || 0), correct: Number(a.correct || 0), total: Number(a.total || 0) };
        }
      }
      setStats(nextStats);
      setAttempts(nextAttempts);
    })().catch(console.error);
  }, [user, date]);

  useEffect(() => {
    document.querySelectorAll("span").forEach((element) => {
      if (!element.textContent?.startsWith("Completed")) return;
      const card = element.closest(".rounded-2xl");
      const scoreRow = element.parentElement?.parentElement;
      if (!card || !scoreRow) return;
      card.classList.add("relative");
      scoreRow.classList.add("sm:absolute", "sm:right-5", "sm:top-5", "sm:border-0", "sm:pt-0", "sm:mt-0");
      element.classList.add("rounded-xl", "border", "border-brand/20", "bg-brand-tint", "px-3", "py-2", "font-bold", "text-brand-darker");
    });
  }, [attempts]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand"/></div>;
  if (!user && !data) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Loading today&apos;s Daily Practice</h1></div>;

  const items = [
    { key: "quant" as Section, title: "Quantitative Aptitude", desc: `${data?.quant?.length || 5} questions` },
    { key: "varc" as Section, title: data?.varc?.type === "VA" ? "VA of the Day" : "RC of the Day", desc: data?.varc?.type === "VA" ? `${data?.varc?.questions?.length || 5} VA questions` : `${data?.varc?.questions?.length || 5} questions` },
    { key: "dilr" as Section, title: "DILR Set of the Day", desc: `${data?.dilr?.questions?.length || 5} questions` },
  ];

  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-[12px] font-semibold uppercase tracking-wide text-brand-dark">Daily Practice</p><h1 className="mt-1 font-display text-[28px] font-bold">Today&apos;s CAT Practice</h1><p className="mt-2 text-sm text-muted">Attempt any section you want. Each section has its own 15-minute timer.</p></div><div className="hidden items-center gap-2 rounded-full bg-brand-tint px-3 py-2 text-xs font-bold text-brand-darker sm:flex"><Flame size={15}/> Keep your streak alive</div></div>
    {!data || data.published === false ? <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center"><h2 className="font-display text-xl font-bold">Today&apos;s practice is being prepared.</h2><p className="mt-2 text-sm text-muted">Please check back shortly.</p></div> : <div className="mt-8 grid gap-4">
      {items.map((item) => {
        const attempt = attempts[item.key];
        return <div key={item.key} className="rounded-2xl border border-border bg-white p-5 transition hover:border-brand/40 hover:shadow-sm">
          <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-darker"><Circle size={20}/></div><div><h2 className="font-display text-lg font-bold">{item.title}</h2><p className="mt-1 text-sm text-muted">{item.desc} · <span className="font-semibold text-brand-darker">15 minutes</span></p></div></div><div className="hidden items-center gap-1.5 text-xs font-semibold text-muted sm:flex"><Users size={14}/> {stats[item.key]} attempted</div></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-3">{attempt ? <><CheckCircle2 size={18} className="text-brand"/><span className="text-sm font-semibold text-brand-darker">Completed · Score {attempt.score}</span></> : <span className="text-xs text-muted"><span className="font-semibold text-brand-darker">{stats[item.key]}</span> people attempted today</span>}</div>
            <Link href={user ? `/daily/question?section=${item.key}` : `/login?returnTo=${encodeURIComponent(`/daily/question?section=${item.key}`)}`} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">{attempt ? "View Result" : user ? "Start Daily Test" : "Log in to attempt"}<ArrowRight size={16}/></Link>
          </div>
        </div>;
      })}
    </div>}
  </div>;
}

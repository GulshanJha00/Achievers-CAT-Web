"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ArrowRight, BookOpenCheck, Brain, CheckCircle2, Circle, Flame, Loader2, Network, Target } from "lucide-react";
import { auth, db } from "@/lib/firebase/client";

type Section = "quant" | "varc" | "dilr";
type DailyPackage = { id: string; date?: string; quant?: unknown[]; varc?: { type?: "RC" | "VA"; questions?: unknown[] }; dilr?: { questions?: unknown[] } };

const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const formatDate = (date: string) => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(`${date}T00:00:00+05:30`));

function sectionsFor(item: DailyPackage) {
  return [
    { key: "quant" as Section, title: "Quantitative Aptitude", count: item.quant?.length || 0, icon: Brain },
    { key: "varc" as Section, title: item.varc?.type === "VA" ? "VA of the Day" : "RC of the Day", count: item.varc?.questions?.length || 0, icon: BookOpenCheck },
    { key: "dilr" as Section, title: "DILR Set of the Day", count: item.dilr?.questions?.length || 0, icon: Network },
  ];
}

function TargetSections({ item, user, attempted }: { item: DailyPackage; user: User | null; attempted: Set<string> }) {
  const date = item.date || item.id;
  return <div className="mt-4 grid gap-3 sm:grid-cols-3">{sectionsFor(item).map((section) => {
    const done = user ? attempted.has(`${date}_${section.key}`) : false;
    const Icon = section.icon;
    const href = user ? `/daily/question?section=${section.key}&date=${date}` : `/login?returnTo=${encodeURIComponent(`/daily/question?section=${section.key}&date=${date}`)}`;
    return <div key={section.key} className="rounded-xl border border-border bg-white p-4"><div className="flex items-center gap-2.5"><span className="rounded-lg bg-brand-tint p-2 text-brand-darker"><Icon size={17} /></span><div className="min-w-0"><p className="truncate text-sm font-semibold">{section.title}</p><p className="text-xs text-muted">{section.count} questions · 15 min</p></div></div><Link href={href} className={`mt-4 flex w-full items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold ${done ? "border border-brand/20 bg-brand-tint text-brand-darker" : "bg-brand text-white hover:bg-brand-dark"}`}>{done ? <><CheckCircle2 size={14} /> View result</> : <>{user ? "Attempt test" : "Log in to attempt"} <ArrowRight size={14} /></>}</Link></div>;
  })}</div>;
}

export default function DailyTargetsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<DailyPackage[]>([]);
  const [attempted, setAttempted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const today = useMemo(() => todayIST(), []);

  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => onSnapshot(query(collection(db, "daily_packages"), where("published", "==", true), orderBy("date", "desc"), limit(60)), (snapshot) => { setPackages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DailyPackage)); setLoading(false); }, (error) => { console.error("Could not load daily targets:", error); setLoading(false); }), []);

  useEffect(() => {
    if (!user || !packages.length) return;
    let active = true;
    Promise.all(packages.flatMap((item) => sectionsFor(item).map(async (section) => {
      const date = item.date || item.id;
      const snapshot = await getDoc(doc(db, "daily_attempts", `${date}_${section.key}_${user.uid}`));
      return snapshot.exists() ? `${date}_${section.key}` : null;
    }))).then((results) => { if (active) setAttempted(new Set(results.filter((value): value is string => Boolean(value)))); }).catch(console.error);
    return () => { active = false; };
  }, [packages, user]);

  const todayPackage = packages.find((item) => (item.date || item.id) === today);
  const previousPackages = packages.filter((item) => (item.date || item.id) !== today);
  const todayCompleted = todayPackage ? sectionsFor(todayPackage).filter((section) => attempted.has(`${today}_${section.key}`)).length : 0;

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>;

  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Daily Practice</p>
    <h1 className="mt-1 font-display text-[28px] font-bold text-foreground">Daily Targets</h1>
    <p className="mt-2 text-sm text-muted">Complete today&apos;s targets or return to any previous daily test whenever you want.</p>

    <section className="mt-7 rounded-2xl border border-border bg-white p-5 shadow-sm sm:p-6">{todayPackage ? <><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-display text-xl font-bold">Today&apos;s Targets</p><p className="mt-1 text-sm text-muted">{formatDate(today)}</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-xs font-bold text-brand-darker"><Flame size={14} className="text-flame" /> {todayCompleted}/3 complete</span></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(todayCompleted / 3) * 100}%` }} /></div><TargetSections item={todayPackage} user={user} attempted={attempted} /></> : <div className="py-5 text-center"><Target className="mx-auto text-brand" /><p className="mt-3 font-semibold">Today&apos;s targets are being prepared.</p></div>}</section>

    <section className="mt-10"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Practice archive</p><h2 className="mt-1 font-display text-2xl font-bold">Previous Daily Targets</h2></div><span className="text-sm text-muted">{previousPackages.length} available</span></div>{previousPackages.length ? <div className="mt-5 space-y-5">{previousPackages.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-surface-muted/40 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><div><p className="font-display text-lg font-bold">Daily Target · {formatDate(item.date || item.id)}</p><p className="mt-1 text-sm text-muted">Revisit any section to practise or review your submitted result.</p></div><Circle size={20} className="text-brand" /></div><TargetSections item={item} user={user} attempted={attempted} /></article>)}</div> : <div className="mt-5 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">Previous daily targets will appear here after they are published.</div>}</section>
  </div>;
}

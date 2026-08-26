"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { ArrowRight, CheckCircle2, Circle, Flame, Loader2 } from "lucide-react";

type DailyPackage = { published?: boolean; quant?: unknown[]; varc?: { type?: string; questions?: unknown[] }; dilr?: { questions?: unknown[] } };

export default function DailyPage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<DailyPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const date = new Date().toLocaleDateString("en-CA");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return unsub;
  }, []);
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, "daily_packages", date)).then((snap) => setData(snap.exists() ? snap.data() as DailyPackage : null));
  }, [user, date]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand"/></div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Sign in to access Daily Practice</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;

  const items = [
    { key: "quant", title: "Quantitative Aptitude", desc: `${data?.quant?.length || 5} questions`, href: "/daily/question?section=quant" },
    { key: "varc", title: data?.varc?.type === "VA" ? "VA of the Day" : "RC of the Day", desc: data?.varc?.type === "VA" ? `${data?.varc?.questions?.length || 5} VA questions` : `${data?.varc?.questions?.length || 5} questions`, href: "/daily/question?section=varc" },
    { key: "dilr", title: "DILR Set of the Day", desc: `${data?.dilr?.questions?.length || 5} questions`, href: "/daily/question?section=dilr" },
  ];

  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-[12px] font-semibold uppercase tracking-wide text-brand-dark">Daily Practice</p><h1 className="mt-1 font-display text-[28px] font-bold">Today&apos;s CAT Practice</h1><p className="mt-2 text-sm text-muted">One focused target from each section, every day.</p></div><div className="hidden items-center gap-2 rounded-full bg-brand-tint px-3 py-2 text-xs font-bold text-brand-darker sm:flex"><Flame size={15}/> Keep your streak alive</div></div>
    {!data || data.published === false ? <div className="mt-8 rounded-2xl border border-border bg-white p-8 text-center"><h2 className="font-display text-xl font-bold">Today&apos;s practice is being prepared.</h2><p className="mt-2 text-sm text-muted">Please check back shortly.</p></div> : <div className="mt-8 grid gap-4">
      {items.map((item) => <Link key={item.key} href={item.href} className="group flex items-center justify-between rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-sm"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-darker"><Circle size={20}/></div><div><h2 className="font-display text-lg font-bold">{item.title}</h2><p className="mt-1 text-sm text-muted">{item.desc}</p></div></div><ArrowRight size={18} className="text-muted transition group-hover:translate-x-1 group-hover:text-brand"/></Link>)}
    </div>}
  </div>;
}

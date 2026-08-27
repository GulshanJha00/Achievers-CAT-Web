"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { Loader2, Trophy } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";

type DailySection = "quant" | "varc" | "dilr";
type DailyAttempt = { id: string; date: string; section: DailySection; score: number; total: number; rank: number; attempters: number; varcType?: "RC" | "VA" };
type Attempt = { score?: unknown; overallScore?: unknown; totalScore?: unknown; mockType?: unknown; testType?: unknown; type?: unknown };
type Category = "Daily Targets" | "Sectional Mocks" | "Full Mocks";

const scoreOf = (attempt: Attempt) => Number(attempt.score ?? attempt.overallScore ?? attempt.totalScore ?? 0);
const average = (scores: number[]) => scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1).replace(/\.0$/, "") : "N/A";
const labelForDailyAttempt = (attempt: DailyAttempt) => attempt.section === "quant" ? "QA (Daily Targets)" : attempt.section === "dilr" ? "DILR Set of the Day (Daily Targets)" : `${attempt.varcType === "VA" ? "VA" : "RC"} of the Day (Daily Targets)`;

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-20 rounded-xl bg-surface-muted px-3 py-2"><p className="font-display text-base font-bold text-foreground">{value}</p><p className="text-[11px] text-muted">{label}</p></div>;
}

function CategorySummary({ title, attempts }: { title: Category; attempts: Attempt[] }) {
  const scores = attempts.map(scoreOf);
  return <section className="rounded-2xl border border-border bg-white p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-display text-lg font-semibold text-foreground">{title}</h2><p className="mt-1 text-sm text-muted">Your completed {title.toLowerCase()}.</p></div><div className="grid grid-cols-3 gap-2 text-center"><Metric label="Attempted" value={attempts.length ? String(attempts.length) : "N/A"} /><Metric label="Average" value={average(scores)} /><Metric label="Best" value={scores.length ? String(Math.max(...scores)) : "N/A"} /></div></div></section>;
}

export default function PerformancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dailyAttempts, setDailyAttempts] = useState<DailyAttempt[]>([]);
  const [sectionalAttempts, setSectionalAttempts] = useState<Attempt[]>([]);
  const [fullMockAttempts, setFullMockAttempts] = useState<Attempt[]>([]);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => setUser(currentUser)), []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [dailySnapshot, attemptsSnapshot] = await Promise.all([getDocs(query(collection(db, "daily_attempts"), where("userId", "==", user.uid))), getDocs(query(collection(db, "attempts"), where("userId", "==", user.uid)))]);
      const dailyRows = dailySnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() })) as (Omit<DailyAttempt, "rank" | "attempters" | "varcType">)[];
      const packageTypes = new Map<string, "RC" | "VA" | undefined>();
      await Promise.all([...new Set(dailyRows.map((attempt) => attempt.date))].map(async (date) => { const packageSnapshot = await getDoc(doc(db, "daily_packages", date)); packageTypes.set(date, packageSnapshot.exists() ? packageSnapshot.data().varc?.type : undefined); }));
      const rankedDailyAttempts = await Promise.all(dailyRows.map(async (attempt) => {
        const leaderboardSnapshot = await getDocs(collection(db, "daily_leaderboards", `${attempt.date}_${attempt.section}`, "entries"));
        const scores = leaderboardSnapshot.docs.map((entry) => Number(entry.data().score || 0));
        return { ...attempt, score: Number(attempt.score || 0), total: Number(attempt.total || 0), rank: scores.filter((score) => score > Number(attempt.score || 0)).length + 1, attempters: scores.length, varcType: packageTypes.get(attempt.date) } as DailyAttempt;
      }));
      const allAttempts = attemptsSnapshot.docs.map((snapshot) => snapshot.data() as Attempt);
      const typeOf = (attempt: Attempt) => String(attempt.mockType ?? attempt.testType ?? attempt.type ?? "").toLowerCase();
      if (!cancelled) { setDailyAttempts(rankedDailyAttempts.sort((a, b) => b.date.localeCompare(a.date))); setSectionalAttempts(allAttempts.filter((attempt) => typeOf(attempt) === "sectional")); setFullMockAttempts(allAttempts.filter((attempt) => ["full", "full-mock", "full_mock"].includes(typeOf(attempt)))); }
    })().catch((error) => console.error("Could not load performance:", error)).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Sign in to view your performance</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><h1 className="font-display text-[28px] font-bold text-foreground">My Performance</h1><p className="mt-2 text-[14.5px] text-muted">Scores and ranks from your submitted tests.</p><div className="mt-8 space-y-4"><CategorySummary title="Daily Targets" attempts={dailyAttempts} /><CategorySummary title="Sectional Mocks" attempts={sectionalAttempts} /><CategorySummary title="Full Mocks" attempts={fullMockAttempts} /></div><section className="mt-6 rounded-2xl border border-border bg-white p-5"><div className="flex items-center gap-2"><Trophy size={18} className="text-brand" /><h2 className="font-display text-lg font-semibold text-foreground">Daily Target Attempts</h2></div>{dailyAttempts.length === 0 ? <p className="mt-4 text-sm text-muted">N/A — you have not attempted a Daily Target yet.</p> : <div className="mt-4 divide-y divide-border">{dailyAttempts.map((attempt) => <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="font-medium text-foreground">{labelForDailyAttempt(attempt)}</p><p className="mt-1 text-xs text-muted">{attempt.date}</p></div><div className="flex items-center gap-5 text-right"><div><p className="font-semibold text-foreground">{attempt.score}/{attempt.total * 3}</p><p className="text-xs text-muted">Your score</p></div><div><p className="font-semibold text-foreground">{attempt.rank}/{attempt.attempters}</p><p className="text-xs text-muted">Rank</p></div></div></div>)}</div>}</section></div>;
}

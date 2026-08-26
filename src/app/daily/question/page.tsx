"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import AssetImage from "@/components/AssetImage";
import { CheckCircle2, Clock3, Loader2, Users } from "lucide-react";
import Link from "next/link";

type MediaValue = { type: "text" | "image"; value: string };
type MCQ = { title?: string; question: MediaValue; options: { label: string; content: MediaValue }[]; correctOption: string; solution: MediaValue; explanation?: MediaValue };
type Package = { published?: boolean; quant: MCQ[]; varc: { type: "RC" | "VA"; title?: string; passage: MediaValue; questions: MCQ[] }; dilr: { title?: string; set: MediaValue; questions: MCQ[] } };

type Section = "quant" | "varc" | "dilr";
const todayIST = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const sectionLabel = (s: Section) => s === "quant" ? "Quantitative Aptitude" : s === "varc" ? "VARC" : "DILR";

function Content({ media, alt }: { media?: MediaValue; alt: string }) {
  if (!media?.value) return null;
  return media.type === "image" ? <AssetImage assetId={media.value} alt={alt}/> : <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{media.value}</div>;
}

export default function DailyQuestionPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const section = (params?.get("section") || "quant") as Section;
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<Package | null>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [seconds, setSeconds] = useState(15 * 60);
  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statsCount, setStatsCount] = useState(0);
  const date = useMemo(todayIST, []);

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }), []);
  useEffect(() => {
    if (!user) return;
    (async () => {
      const snap = await getDoc(doc(db, "daily_packages", date));
      if (snap.exists() && snap.data().published !== false) setData(snap.data() as Package);
      const attemptSnap = await getDoc(doc(db, "daily_attempts", `${date}_${section}_${user.uid}`));
      if (attemptSnap.exists()) { setAttempt(attemptSnap.data()); setSubmitted(true); }
      const statSnap = await getDoc(doc(db, "daily_section_stats", `${date}_${section}`));
      if (statSnap.exists()) setStatsCount(Number(statSnap.data().count || 0));
    })().catch(console.error);
  }, [user, date, section]);

  const questions = !data ? [] : section === "quant" ? data.quant : section === "varc" ? data.varc.questions : data.dilr.questions;
  const title = !data ? sectionLabel(section) : section === "quant" ? "Quantitative Aptitude" : section === "varc" ? (data.varc.type === "VA" ? "VA of the Day" : "RC of the Day") : "DILR Set of the Day";

  useEffect(() => {
    if (!started || submitted) return;
    if (seconds <= 0) { submitAttempt(true); return; }
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, seconds]);

  async function submitAttempt(auto = false) {
    if (!user || !data || submitted || saving) return;
    setSaving(true);
    const correct = questions.reduce((sum, q, i) => sum + (answers[i] === q.correctOption ? 1 : 0), 0);
    const total = questions.length;
    const score = correct; // Daily Practice score is shown as correct answers out of total.
    const attemptId = `${date}_${section}_${user.uid}`;
    const statId = `${date}_${section}`;
    try {
      await runTransaction(db, async (tx) => {
        const attemptRef = doc(db, "daily_attempts", attemptId);
        const statRef = doc(db, "daily_section_stats", statId);
        const attemptSnap = await tx.get(attemptRef);
        if (attemptSnap.exists()) return;
        const statSnap = await tx.get(statRef);
        const currentCount = statSnap.exists() ? Number(statSnap.data().count || 0) : 0;
        tx.set(attemptRef, {
          userId: user.uid,
          email: user.email || "",
          displayName: user.displayName || "",
          date,
          section,
          score,
          correct,
          total,
          answers,
          timeTakenSeconds: 15 * 60 - seconds,
          timedOut: auto,
          submittedAt: serverTimestamp(),
        });
        tx.set(statRef, { date, section, count: currentCount + 1, updatedAt: serverTimestamp() }, { merge: true });
      });
      const saved = await getDoc(doc(db, "daily_attempts", attemptId));
      if (saved.exists()) setAttempt(saved.data());
      const statSnap = await getDoc(doc(db, "daily_section_stats", statId));
      if (statSnap.exists()) setStatsCount(Number(statSnap.data().count || 0));
      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Could not save your score. Please try again.");
    } finally { setSaving(false); }
  }

  if (authLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand"/></div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Sign in to attempt today&apos;s practice</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;
  if (!data) return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Today&apos;s practice is being prepared.</h1></div>;

  const timeText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const answered = Object.keys(answers).length;
  const displayScore = attempt?.score ?? questions.reduce((sum, q, i) => sum + (answers[i] === q.correctOption ? 1 : 0), 0);

  return <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Daily Practice · {new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p><h1 className="mt-1 font-display text-2xl font-bold">{title}</h1><p className="mt-1 text-sm text-muted">{questions.length} questions · one attempt per day</p></div>
      <div className="flex items-center gap-3"><div className="hidden items-center gap-1.5 text-xs font-semibold text-muted sm:flex"><Users size={14}/> {statsCount} attempted</div><div className="rounded-xl border border-border bg-white px-4 py-2.5 text-center shadow-sm"><div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted"><Clock3 size={12}/> Time left</div><div className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-brand-dark">{timeText}</div></div></div>
    </div>

    {section === "varc" && data.varc.type === "RC" && <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{data.varc.title || "Reading Comprehension"}</h2><div className="mt-4"><Content media={data.varc.passage} alt="RC passage"/></div></div>}
    {section === "dilr" && <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{data.dilr.title || "DILR Set"}</h2><div className="mt-4"><Content media={data.dilr.set} alt="DILR set"/></div></div>}

    {!started && !submitted && <div className="mt-6 rounded-2xl border border-border bg-white p-6 text-center"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand-darker"><Clock3 size={22}/></div><h2 className="mt-3 font-display text-xl font-bold">Ready?</h2><p className="mt-1 text-sm text-muted">You have <strong className="text-brand-darker">15 minutes</strong> for this section. You can leave the other sections for another time.</p><button onClick={() => setStarted(true)} className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark">Start {sectionLabel(section)} Test</button></div>}

    {started && !submitted && <div className="mt-5 rounded-xl border border-brand/20 bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-darker">Timer is running. When it reaches 00:00, your answers will be submitted automatically.</div>}

    <div className="mt-5 space-y-5">{questions.map((q, i) => {
      const selected = answers[i];
      const isSubmitted = submitted;
      const correct = isSubmitted && selected === q.correctOption;
      return <div key={i} className="rounded-2xl border border-border bg-white p-5 sm:p-6">
        <div className="text-xs font-bold uppercase tracking-wide text-muted">Question {i + 1}</div>
        {q.title && <h3 className="mt-1 font-display text-lg font-bold">{q.title}</h3>}
        <div className="mt-4"><Content media={q.question} alt={`Question ${i + 1}`}/></div>
        <div className="mt-6 grid gap-2.5">{q.options.map((option) => { const isCorrect = isSubmitted && option.label === q.correctOption; const isWrong = isSubmitted && selected === option.label && option.label !== q.correctOption; return <button key={option.label} disabled={!started || submitted} onClick={() => setAnswers((a) => ({ ...a, [i]: option.label }))} className={`rounded-xl border px-4 py-3 text-left transition ${isCorrect ? "border-brand bg-brand-tint" : isWrong ? "border-danger/40 bg-red-50" : selected === option.label ? "border-brand bg-brand-tint" : "border-border hover:border-brand/50"}`}><div className="flex gap-3"><span className="mt-0.5 shrink-0 font-semibold">{option.label}.</span><div className="min-w-0 flex-1"><Content media={option.content} alt={`Option ${option.label}`}/></div>{isCorrect && <CheckCircle2 className="mt-0.5 shrink-0 text-brand" size={18}/>}</div></button>; })}</div>
        {isSubmitted && <div className="mt-6 rounded-2xl bg-surface-muted p-5"><p className={`text-sm font-bold ${correct ? "text-brand-darker" : "text-danger"}`}>{correct ? "Correct!" : `Incorrect — correct answer: ${q.correctOption}`}</p>{q.solution?.value && <div className="mt-5"><p className="mb-2 text-xs font-semibold">Solution</p><Content media={q.solution} alt="Solution"/></div>}{q.explanation?.value && <div className="mt-5 border-t border-border pt-4"><p className="mb-2 text-xs font-semibold">Explanation</p><Content media={q.explanation} alt="Explanation"/></div>}</div>}
      </div>;
    })}</div>

    {started && !submitted && <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-lg"><span className="text-sm text-muted">Answered <strong className="text-foreground">{answered}/{questions.length}</strong></span><button disabled={saving} onClick={() => submitAttempt(false)} className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Submit Section"}</button></div>}
    {submitted && <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-tint p-6 text-center"><p className="text-xs font-bold uppercase tracking-wide text-brand-darker">Section complete</p><h2 className="mt-1 font-display text-2xl font-bold">Score: {displayScore}/{questions.length}</h2><p className="mt-1 text-sm text-muted">{attempt?.correct ?? displayScore} correct · {statsCount} people have attempted this section today.</p><Link href="/daily" className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white">Back to Daily Practice</Link></div>}
  </div>;
}

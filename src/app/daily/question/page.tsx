"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import AssetImage from "@/components/AssetImage";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

type MediaValue = { type: "text" | "image"; value: string };
type MCQ = { title?: string; question: MediaValue; options: { label: string; content: MediaValue }[]; correctOption: string; solution: MediaValue; explanation?: MediaValue };
type Package = { published?: boolean; quant: MCQ[]; varc: { type: "RC" | "VA"; title?: string; passage: MediaValue; questions: MCQ[] }; dilr: { title?: string; set: MediaValue; questions: MCQ[] } };

function Content({ media, alt }: { media?: MediaValue; alt: string }) {
  if (!media?.value) return null;
  return media.type === "image" ? <AssetImage assetId={media.value} alt={alt}/> : <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{media.value}</div>;
}

function MCQCard({ question, number }: { question: MCQ; number: number }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const correct = submitted && selected === question.correctOption;
  return <div className="rounded-2xl border border-border bg-white p-5 sm:p-6">
    <div className="text-xs font-bold uppercase tracking-wide text-muted">Question {number}</div>
    {question.title && <h3 className="mt-1 font-display text-lg font-bold">{question.title}</h3>}
    <div className="mt-4"><Content media={question.question} alt={`Question ${number}`}/></div>
    <div className="mt-6 flex flex-col gap-2.5">{question.options.map((option) => { const isCorrect = submitted && option.label === question.correctOption; const isWrong = submitted && selected === option.label && option.label !== question.correctOption; return <button key={option.label} disabled={submitted} onClick={() => setSelected(option.label)} className={`rounded-xl border px-4 py-3 text-left transition ${isCorrect ? "border-brand bg-brand-tint" : isWrong ? "border-danger/40 bg-red-50" : selected === option.label ? "border-brand bg-brand-tint" : "border-border hover:border-brand/50"}`}><div className="flex gap-3"><span className="mt-0.5 shrink-0 font-semibold">{option.label}.</span><div className="min-w-0 flex-1"><Content media={option.content} alt={`Option ${option.label}`}/></div>{isCorrect && <CheckCircle2 className="mt-0.5 shrink-0 text-brand" size={18}/>}</div></button>; })}</div>
    {!submitted ? <button disabled={!selected} onClick={() => setSubmitted(true)} className="mt-6 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Submit Answer</button> : <div className="mt-6 rounded-2xl bg-surface-muted p-5"><p className={`text-sm font-bold ${correct ? "text-brand-darker" : "text-danger"}`}>{correct ? "Correct!" : `Incorrect — correct answer: ${question.correctOption}`}</p>{question.solution?.value && <div className="mt-5"><p className="mb-2 text-xs font-semibold">Solution</p><Content media={question.solution} alt="Solution"/></div>}{question.explanation?.value && <div className="mt-5 border-t border-border pt-4"><p className="mb-2 text-xs font-semibold">Explanation</p><Content media={question.explanation} alt="Explanation"/></div>}</div>}
  </div>;
}

export default function DailyQuestionPage() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const section = params?.get("section") || "quant";
  const [signedIn, setSignedIn] = useState(false); const [authLoading, setAuthLoading] = useState(true); const [data, setData] = useState<Package | null>(null);
  const date = useMemo(() => new Date().toLocaleDateString("en-CA"), []);
  useEffect(() => onAuthStateChanged(auth, (u) => { setSignedIn(!!u); setAuthLoading(false); }), []);
  useEffect(() => { if (!signedIn) return; getDoc(doc(db, "daily_packages", date)).then((snap) => { if (snap.exists() && snap.data().published !== false) setData(snap.data() as Package); }); }, [signedIn, date]);
  if (authLoading) return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand"/></div>;
  if (!signedIn) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Sign in to attempt today&apos;s practice</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;
  if (!data) return <div className="mx-auto max-w-2xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Today&apos;s practice is being prepared.</h1></div>;

  const isQuant = section === "quant"; const isVarc = section === "varc"; const title = isQuant ? "Quantitative Aptitude" : isVarc ? (data.varc.type === "VA" ? "VA of the Day" : "RC of the Day") : "DILR Set of the Day";
  const questions = isQuant ? data.quant : isVarc ? data.varc.questions : data.dilr.questions;
  return <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8"><p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Daily Practice · {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p><h1 className="mt-1 font-display text-2xl font-bold">{title}</h1>{isVarc && data.varc.type === "RC" && <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{data.varc.title || "Reading Comprehension"}</h2><div className="mt-4"><Content media={data.varc.passage} alt="RC passage"/></div></div>}{!isQuant && !isVarc && <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6"><h2 className="font-display text-lg font-bold">{data.dilr.title || "DILR Set"}</h2><div className="mt-4"><Content media={data.dilr.set} alt="DILR set"/></div></div>}<div className="mt-5 space-y-5">{questions.map((q, i) => <MCQCard key={i} question={q} number={i + 1}/>)}</div><div className="mt-6 text-center text-sm text-muted"><Link href="/daily" className="hover:text-brand-darker">← Back to Daily Practice</Link></div></div>;
}

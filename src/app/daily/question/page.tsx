"use client";

import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "@/lib/firebase/client";
import AssetImage from "@/components/AssetImage";
import { CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";

type MediaValue = { type: "text" | "image"; value: string };
type DailyQuestion = {
  section: string;
  title: string;
  question: MediaValue;
  options: Array<{ label: string; content: MediaValue }>;
  correctOption: string;
  solution: MediaValue;
  explanation?: MediaValue;
  difficulty?: string;
  topic?: string;
};

function Content({ media, alt }: { media: MediaValue; alt: string }) {
  if (!media?.value) return null;
  if (media.type === "image") return <AssetImage assetId={media.value} alt={alt} />;
  return <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{media.value}</div>;
}

export default function QuestionOfTheDayPage() {
  const [data, setData] = useState<DailyQuestion | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const date = useMemo(() => new Date().toLocaleDateString("en-CA"), []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => { setSignedIn(!!user); setAuthLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    getDoc(doc(db, "daily_questions", date)).then((snap) => {
      if (snap.exists() && snap.data().published !== false) setData(snap.data() as DailyQuestion);
    });
  }, [signedIn, date]);

  if (authLoading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-brand" /></div>;
  }

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to attempt today&apos;s question</h1>
        <p className="mt-2 text-sm text-muted">Use your Google account to save your practice progress.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-brand-dark">Question of the Day</p>
        <h1 className="mt-2 font-display text-2xl font-bold">Today&apos;s question is being prepared.</h1>
        <p className="mt-2 text-sm text-muted">Please check back shortly.</p>
      </div>
    );
  }

  const answeredCorrectly = submitted && selected === data.correctOption;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-dark">Question of the Day · {data.section}</p>
      <h1 className="mt-1 font-display text-[24px] font-bold text-foreground">{data.title || "Daily CAT Question"}</h1>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
        <Content media={data.question} alt="Question of the Day" />

        <div className="mt-6 flex flex-col gap-2.5">
          {data.options.map((option) => {
            const isCorrect = submitted && option.label === data.correctOption;
            const isWrong = submitted && selected === option.label && option.label !== data.correctOption;
            return (
              <button key={option.label} disabled={submitted} onClick={() => setSelected(option.label)} className={`rounded-xl border px-4 py-3 text-left transition ${isCorrect ? "border-brand bg-brand-tint" : isWrong ? "border-danger/40 bg-red-50" : selected === option.label ? "border-brand bg-brand-tint" : "border-border hover:border-brand/50"}`}>
                <div className="flex gap-3">
                  <span className="mt-0.5 shrink-0 font-semibold">{option.label}.</span>
                  <div className="min-w-0 flex-1"><Content media={option.content} alt={`Option ${option.label}`} /></div>
                  {isCorrect && <CheckCircle2 className="mt-0.5 shrink-0 text-brand" size={18} />}
                </div>
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button disabled={!selected} onClick={() => setSubmitted(true)} className="mt-6 rounded-full bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40">
            Submit Answer
          </button>
        ) : (
          <div className="mt-6 rounded-2xl bg-surface-muted p-5">
            <p className={`text-[15px] font-bold ${answeredCorrectly ? "text-brand-darker" : "text-danger"}`}>
              {answeredCorrectly ? "Correct!" : `Incorrect — correct answer: ${data.correctOption}`}
            </p>
            {data.solution?.value && (
              <div className="mt-5">
                <p className="mb-2 text-[13px] font-semibold text-foreground">Solution</p>
                <Content media={data.solution} alt="Worked solution" />
              </div>
            )}
            {data.explanation?.value && (
              <div className="mt-5 border-t border-border pt-4">
                <p className="mb-2 text-[13px] font-semibold text-foreground">Explanation</p>
                <Content media={data.explanation} alt="Explanation" />
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-[12.5px] text-muted">
              {data.difficulty && <span>Difficulty: {data.difficulty}</span>}
              {data.topic && <span>Topic: {data.topic}</span>}
            </div>
          </div>
        )}
      </div>
      <div className="mt-5 text-center text-[13px] text-muted"><Link href="/daily" className="hover:text-brand-darker">← Back to Daily Practice</Link></div>
    </div>
  );
}

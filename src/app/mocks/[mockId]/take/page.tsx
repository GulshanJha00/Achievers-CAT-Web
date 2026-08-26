"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Flag, Grid3x3, X, ChevronLeft, ChevronRight } from "lucide-react";

const SECTIONS = ["VARC", "DILR", "QA"] as const;
type SectionName = (typeof SECTIONS)[number];
type QStatus = "unanswered" | "answered" | "marked" | "not-visited";

// Placeholder — swap for a Firebase fetch of Firestore `mock_sections` + `questions`
// for this `mockId`, scored server-side only after submission.
const QUESTIONS_PER_SECTION = 8;
const SECTION_MINUTES = 40;

function makeSection(): { status: QStatus; selected: string | null }[] {
  return Array.from({ length: QUESTIONS_PER_SECTION }, (_, i) => ({
    status: i === 0 ? "unanswered" : "not-visited",
    selected: null,
  }));
}

export default function TakeMockPage() {
  const router = useRouter();
  const params = useParams();
  const mockId = params.mockId as string;

  const [section, setSection] = useState<SectionName>("VARC");
  const [qIndex, setQIndex] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [seconds, setSeconds] = useState(SECTION_MINUTES * 60);
  const [answers, setAnswers] = useState<Record<SectionName, { status: QStatus; selected: string | null }[]>>({
    VARC: makeSection(),
    DILR: makeSection(),
    QA: makeSection(),
  });

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  const current = answers[section][qIndex];

  function select(option: string) {
    setAnswers((prev) => {
      const next = structuredClone(prev);
      next[section][qIndex] = { status: "answered", selected: option };
      return next;
    });
  }

  function markForReview() {
    setAnswers((prev) => {
      const next = structuredClone(prev);
      const cur = next[section][qIndex];
      next[section][qIndex] = { ...cur, status: "marked" };
      return next;
    });
  }

  function goTo(i: number) {
    setQIndex(i);
    setAnswers((prev) => {
      const next = structuredClone(prev);
      if (next[section][i].status === "not-visited") {
        next[section][i].status = "unanswered";
      }
      return next;
    });
    setPaletteOpen(false);
  }

  function saveAndNext() {
    if (qIndex < QUESTIONS_PER_SECTION - 1) goTo(qIndex + 1);
  }

  const statusColor: Record<QStatus, string> = {
    answered: "bg-brand text-white",
    marked: "bg-violet-500 text-white",
    unanswered: "bg-red-100 text-red-700 border border-red-300",
    "not-visited": "bg-surface-muted text-muted border border-border",
  };

  const answeredCount = answers[section].filter((q) => q.status === "answered").length;

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-surface-muted">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border bg-white px-4 py-3 sm:px-6">
        <div>
          <p className="font-display text-[14px] font-semibold text-foreground">
            Mock #{mockId}
          </p>
          <p className="text-[12px] text-muted">Section: {section}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-brand-tint px-3 py-1.5 text-[13.5px] font-semibold text-brand-darker">
          <Clock size={15} />
          {mins}:{secs}
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[13px] font-semibold text-foreground lg:hidden"
        >
          <Grid3x3 size={15} /> {qIndex + 1}/{QUESTIONS_PER_SECTION}
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 border-b border-border bg-white px-4 pb-2 pt-1 sm:px-6">
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setSection(s);
              setQIndex(0);
            }}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
              section === s
                ? "bg-foreground text-white"
                : "text-muted hover:bg-surface-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="flex flex-1 gap-4 p-4 sm:p-6">
        {/* Question panel */}
        <div className="flex flex-1 flex-col rounded-2xl border border-border bg-white p-5">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">
            Question {qIndex + 1} of {QUESTIONS_PER_SECTION}
          </p>
          <p className="mt-3 text-[15.5px] leading-relaxed text-foreground">
            {section === "VARC"
              ? "Based on the passage, which of the following best captures the author's central argument?"
              : section === "DILR"
              ? "Using the arrangement described, how many people are seated between P and S?"
              : "If x + 1/x = 5, what is the value of x\u00b3 + 1/x\u00b3?"}
          </p>

          <div className="mt-6 flex flex-1 flex-col gap-2.5">
            {["A", "B", "C", "D"].map((opt) => (
              <button
                key={opt}
                onClick={() => select(opt)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14.5px] transition ${
                  current.selected === opt
                    ? "border-brand bg-brand-tint text-brand-darker"
                    : "border-border text-foreground hover:border-brand/50"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                    current.selected === opt
                      ? "bg-brand text-white"
                      : "bg-surface-muted text-muted"
                  }`}
                >
                  {opt}
                </span>
                Option {opt} — sample answer choice text goes here
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <button
              onClick={() => qIndex > 0 && goTo(qIndex - 1)}
              disabled={qIndex === 0}
              className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-[13.5px] font-semibold text-foreground disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <div className="flex flex-1 flex-wrap justify-end gap-2 sm:flex-none">
              <button
                onClick={markForReview}
                className="flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[13.5px] font-semibold text-violet-700"
              >
                <Flag size={14} /> Mark for Review
              </button>
              <button
                onClick={saveAndNext}
                className="flex items-center gap-1 rounded-full bg-brand px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-brand-dark"
              >
                Save &amp; Next <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Question palette — desktop */}
        <div className="hidden w-64 shrink-0 flex-col rounded-2xl border border-border bg-white p-4 lg:flex">
          <PaletteContent
            answers={answers[section]}
            statusColor={statusColor}
            goTo={goTo}
            qIndex={qIndex}
            answeredCount={answeredCount}
            onSubmit={() => router.push(`/mocks/${mockId}/result`)}
          />
        </div>
      </div>

      {/* Question palette — mobile drawer */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden">
          <div className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 thin-scroll">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-[14.5px] font-semibold">Questions</p>
              <button onClick={() => setPaletteOpen(false)} aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <PaletteContent
              answers={answers[section]}
              statusColor={statusColor}
              goTo={goTo}
              qIndex={qIndex}
              answeredCount={answeredCount}
              onSubmit={() => router.push(`/mocks/${mockId}/result`)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteContent({
  answers,
  statusColor,
  goTo,
  qIndex,
  answeredCount,
  onSubmit,
}: {
  answers: { status: QStatus; selected: string | null }[];
  statusColor: Record<QStatus, string>;
  goTo: (i: number) => void;
  qIndex: number;
  answeredCount: number;
  onSubmit: () => void;
}) {
  return (
    <>
      <p className="hidden font-display text-[14px] font-semibold text-foreground lg:block">
        Questions
      </p>
      <p className="mt-1 text-[12px] text-muted">
        {answeredCount}/{answers.length} answered
      </p>
      <div className="mt-3 grid grid-cols-6 gap-2 lg:grid-cols-5">
        {answers.map((q, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold ${statusColor[q.status]} ${
              i === qIndex ? "ring-2 ring-offset-1 ring-foreground" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-1.5 border-t border-border pt-4 text-[12px] text-muted">
        <Legend color="bg-brand" label="Answered" />
        <Legend color="bg-red-200" label="Not answered" />
        <Legend color="bg-violet-500" label="Marked for review" />
        <Legend color="bg-surface-muted border border-border" label="Not visited" />
      </div>

      <button
        onClick={onSubmit}
        className="mt-5 w-full rounded-full bg-foreground px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-foreground/90"
      >
        Submit Mock
      </button>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded ${color}`} />
      {label}
    </div>
  );
}

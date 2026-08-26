"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const QUESTIONS = [
  "What is the central theme of the passage?",
  "Which of the following best describes the author's tone?",
  "The author would most likely agree with which statement?",
  "Which word, as used in the passage, is closest in meaning to 'ephemeral'?",
  "What can be inferred about the author's view on the topic?",
];

export default function RCOfTheDayPage() {
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [finished, setFinished] = useState(false);

  if (finished) {
    const answered = Object.keys(answers).length;
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="font-display text-[24px] font-bold text-foreground">
          Results
        </h1>
        <p className="mt-2 text-[14.5px] text-muted">
          You answered {answered} of {QUESTIONS.length} questions.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Correct" value="4" />
          <Stat label="Incorrect" value="1" />
          <Stat label="Accuracy" value="80%" />
          <Stat label="Time" value="6m 12s" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-dark">
        RC of the Day
      </p>
      <h1 className="mt-1 font-display text-[22px] font-bold text-foreground">
        Philosophy &amp; Human Behaviour
      </h1>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="thin-scroll max-h-[420px] overflow-y-auto rounded-2xl border border-border bg-white p-5 text-[14px] leading-relaxed text-foreground">
          <p>
            Human behaviour has long fascinated philosophers, who have sought
            to explain not just what people do, but why they do it. From
            early debates about free will to contemporary discussions of
            cognitive bias, the central tension remains the same: how much of
            what we do is chosen, and how much is determined by forces
            outside our awareness...
          </p>
          <p className="mt-3">
            (Full passage text — this placeholder stands in for the actual
            passage pulled from the daily_rcs table.)
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-muted">
            Question {qIndex + 1} of {QUESTIONS.length}
          </p>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground">
            {QUESTIONS[qIndex]}
          </p>

          <div className="mt-5 flex flex-col gap-2.5">
            {["A", "B", "C", "D"].map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setAnswers((a) => ({ ...a, [qIndex]: opt }))
                }
                className={`rounded-xl border px-4 py-2.5 text-left text-[14px] transition ${
                  answers[qIndex] === opt
                    ? "border-brand bg-brand-tint text-brand-darker"
                    : "border-border text-foreground hover:border-brand/50"
                }`}
              >
                {opt}. Sample option text
              </button>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => setQIndex((i) => Math.max(0, i - 1))}
              disabled={qIndex === 0}
              className="flex items-center gap-1 rounded-full border border-border px-4 py-2 text-[13px] font-semibold text-foreground disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            {qIndex < QUESTIONS.length - 1 ? (
              <button
                onClick={() => setQIndex((i) => i + 1)}
                className="flex items-center gap-1 rounded-full bg-brand px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-dark"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => setFinished(true)}
                className="rounded-full bg-foreground px-5 py-2 text-[13px] font-semibold text-white hover:bg-foreground/90"
              >
                View Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="font-display text-[20px] font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[12px] text-muted">{label}</p>
    </div>
  );
}

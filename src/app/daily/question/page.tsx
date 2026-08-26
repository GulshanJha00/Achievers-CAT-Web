"use client";

import { useState } from "react";

const OPTIONS = ["76", "80", "85", "90"];
const CORRECT = "80";

export default function QuestionOfTheDayPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-dark">
        Question of the Day · QA
      </p>
      <h1 className="mt-1 font-display text-[22px] font-bold text-foreground">
        Algebra
      </h1>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <p className="text-[15.5px] leading-relaxed text-foreground">
          If x + 1/x = 5, find the value of x&sup2; + 1/x&sup2;.
        </p>

        <div className="mt-5 flex flex-col gap-2.5">
          {OPTIONS.map((opt) => {
            const isCorrect = submitted && opt === CORRECT;
            const isWrong = submitted && selected === opt && opt !== CORRECT;
            return (
              <button
                key={opt}
                disabled={submitted}
                onClick={() => setSelected(opt)}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-[14.5px] transition ${
                  isCorrect
                    ? "border-brand bg-brand-tint text-brand-darker"
                    : isWrong
                    ? "border-danger/40 bg-danger/5 text-danger"
                    : selected === opt
                    ? "border-brand bg-brand-tint text-brand-darker"
                    : "border-border text-foreground hover:border-brand/50"
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {!submitted ? (
          <button
            disabled={!selected}
            onClick={() => setSubmitted(true)}
            className="mt-6 rounded-full bg-brand px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-brand-dark disabled:opacity-40"
          >
            Submit Answer
          </button>
        ) : (
          <div className="mt-6 rounded-xl bg-surface-muted p-4">
            <p
              className={`text-[14px] font-semibold ${
                selected === CORRECT ? "text-brand-darker" : "text-danger"
              }`}
            >
              {selected === CORRECT ? "Correct!" : "Incorrect."}
            </p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              <span className="font-semibold text-foreground">Explanation: </span>
              Squaring x + 1/x = 5 gives x&sup2; + 1/x&sup2; + 2 = 25, so
              x&sup2; + 1/x&sup2; = 23... (worked answer shown after submission)
            </p>
            <div className="mt-3 flex gap-4 text-[12.5px] text-muted">
              <span>Difficulty: Medium</span>
              <span>Topic: Algebra</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

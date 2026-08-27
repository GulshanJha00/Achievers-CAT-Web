"use client";

import { useEffect, useMemo, useState } from "react";
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import AssetImage from "@/components/AssetImage";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  Users,
  Trophy,
} from "lucide-react";
import Link from "next/link";

type MediaValue = {
  type: "text" | "image";
  value: string;
};

type MCQ = {
  title?: string;
  question: MediaValue;
  options: {
    label: string;
    content: MediaValue;
  }[];
  correctOption: string;
  solution: MediaValue;
  explanation?: MediaValue;
};

type Package = {
  published?: boolean;

  quant: MCQ[];

  varc: {
    type: "RC" | "VA";
    title?: string;
    passage: MediaValue;
    questions: MCQ[];
  };

  dilr: {
    title?: string;
    set: MediaValue;
    questions: MCQ[];
  };
};

type Section = "quant" | "varc" | "dilr";

const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const sectionLabel = (section: Section) => {
  if (section === "quant") return "Quantitative Aptitude";
  if (section === "varc") return "VARC";
  return "DILR";
};

/*
 * RC = maximum 4 questions
 * VA = maximum 5 questions
 *
 * This means even if an old RC package accidentally contains 5 questions,
 * students will only see the first 4.
 */
function getSectionQuestions(
  data: Package,
  section: Section
): MCQ[] {
  if (section === "quant") {
    return data.quant.slice(0, 5);
  }

  if (section === "varc") {
    const limit = data.varc.type === "RC" ? 4 : 5;
    return data.varc.questions.slice(0, limit);
  }

  return data.dilr.questions;
}

function Content({
  media,
  alt,
}: {
  media?: MediaValue;
  alt: string;
}) {
  if (!media?.value) return null;

  if (media.type === "image") {
    return <AssetImage assetId={media.value} alt={alt} />;
  }

  return (
    <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
      {media.value}
    </div>
  );
}

export default function DailyQuestionPage() {
  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const section =
    (params?.get("section") || "quant") as Section;

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [data, setData] = useState<Package | null>(null);
  const [attempt, setAttempt] = useState<any>(null);

  const [answers, setAnswers] = useState<Record<number, string>>(
    {}
  );

  const [seconds, setSeconds] = useState(15 * 60);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [statsCount, setStatsCount] = useState(0);

  const date = useMemo(todayIST, []);

  /*
   * AUTH
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /*
   * LOAD DAILY PACKAGE + EXISTING ATTEMPT + LIVE COUNT
   */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      try {
        const packageSnap = await getDoc(
          doc(db, "daily_packages", date)
        );

        if (
          packageSnap.exists() &&
          packageSnap.data().published !== false
        ) {
          if (!cancelled) {
            setData(packageSnap.data() as Package);
          }
        }

        /*
         * Check whether this student already completed the section.
         */
        const attemptId = `${date}_${section}_${user.uid}`;

        const attemptSnap = await getDoc(
          doc(db, "daily_attempts", attemptId)
        );

        if (attemptSnap.exists() && !cancelled) {
          const savedAttempt = attemptSnap.data();

          setAttempt(savedAttempt);

          /*
           * Restore the student's answers so that the selected options
           * are visible when they return to their result.
           */
          if (savedAttempt.answers) {
            setAnswers(savedAttempt.answers);
          }

          setSubmitted(true);
          setStarted(false);
        }

        /*
         * Load current number of students who attempted this section.
         */
        const statSnap = await getDoc(
          doc(
            db,
            "daily_section_stats",
            `${date}_${section}`
          )
        );

        if (statSnap.exists() && !cancelled) {
          setStatsCount(
            Number(statSnap.data().count || 0)
          );
        }
      } catch (error) {
        console.error(error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, date, section]);

  /*
   * QUESTIONS
   */
  const questions = data
    ? getSectionQuestions(data, section)
    : [];

  /*
   * TITLE
   */
  const title = !data
    ? sectionLabel(section)
    : section === "quant"
    ? "Quantitative Aptitude"
    : section === "varc"
    ? data.varc.type === "VA"
      ? "VA of the Day"
      : "RC of the Day"
    : "DILR Set of the Day";

  /*
   * MAXIMUM MARKS
   */
  const maximumMarks = questions.length * 3;

  /*
   * TIMER
   */
  useEffect(() => {
    if (!started || submitted) return;

    if (seconds <= 0) {
      submitAttempt(true);
      return;
    }

    const intervalId = window.setInterval(() => {
      setSeconds((current) =>
        Math.max(0, current - 1)
      );
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };

    // submitAttempt intentionally omitted from dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, seconds]);

  /*
   * SUBMIT
   *
   * Scoring:
   * Correct = +3
   * Wrong = -1
   * Unanswered = 0
   */
  async function submitAttempt(auto = false) {
    if (
      !user ||
      !data ||
      submitted ||
      saving
    ) {
      return;
    }

    setSaving(true);

    const total = questions.length;

    const answeredCount = Object.keys(answers).length;

    const correct = questions.reduce(
      (sum, question, index) => {
        return (
          sum +
          (answers[index] === question.correctOption
            ? 1
            : 0)
        );
      },
      0
    );

    const wrong = Math.max(
      0,
      answeredCount - correct
    );

    const score =
      correct * 3 - wrong;

    const attemptId =
      `${date}_${section}_${user.uid}`;

    const statId =
      `${date}_${section}`;

    try {
      await runTransaction(db, async (tx) => {
        const attemptRef = doc(
          db,
          "daily_attempts",
          attemptId
        );

        const statRef = doc(
          db,
          "daily_section_stats",
          statId
        );

        /*
         * NEW:
         * Individual leaderboard entry.
         */
        const leaderboardEntryRef = doc(
          db,
          "daily_leaderboards",
          date,
          section,
          "entries",
          user.uid
        );

        const attemptSnap = await tx.get(
          attemptRef
        );

        /*
         * Prevent duplicate attempts.
         */
        if (attemptSnap.exists()) {
          return;
        }

        const statSnap = await tx.get(
          statRef
        );

        const currentCount = statSnap.exists()
          ? Number(
              statSnap.data().count || 0
            )
          : 0;

        /*
         * Save student's actual attempt.
         */
        tx.set(attemptRef, {
          userId: user.uid,
          email: user.email || "",
          displayName:
            user.displayName ||
            user.email?.split("@")[0] ||
            "Student",

          date,
          section,

          score,
          correct,
          wrong,
          total,

          answers,

          timeTakenSeconds:
            15 * 60 - seconds,

          timedOut: auto,

          submittedAt:
            serverTimestamp(),
        });

        /*
         * Update live section count.
         */
        tx.set(
          statRef,
          {
            date,
            section,
            count: currentCount + 1,
            updatedAt:
              serverTimestamp(),
          },
          { merge: true }
        );

        /*
         * Save leaderboard entry.
         */
        tx.set(
          leaderboardEntryRef,
          {
            userId: user.uid,

            displayName:
              user.displayName ||
              user.email?.split("@")[0] ||
              "Student",

            email:
              user.email || "",

            date,
            section,

            score,
            correct,
            wrong,
            total,

            submittedAt:
              serverTimestamp(),
          }
        );
      });

      /*
       * Reload saved attempt.
       */
      const savedAttempt = await getDoc(
        doc(
          db,
          "daily_attempts",
          attemptId
        )
      );

      if (savedAttempt.exists()) {
        setAttempt(savedAttempt.data());
      }

      /*
       * Reload live count.
       */
      const statSnap = await getDoc(
        doc(
          db,
          "daily_section_stats",
          statId
        )
      );

      if (statSnap.exists()) {
        setStatsCount(
          Number(
            statSnap.data().count || 0
          )
        );
      }

      setSubmitted(true);
      setStarted(false);
    } catch (error) {
      console.error(
        "Error saving daily attempt:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Could not save your score. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  /*
   * LOADING
   */
  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  /*
   * NOT LOGGED IN
   */
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">
          Sign in to attempt today&apos;s practice
        </h1>

        <Link
          href="/login"
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Continue with Google
        </Link>
      </div>
    );
  }

  /*
   * DATA NOT READY
   */
  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">
          Today&apos;s practice is being prepared.
        </h1>
      </div>
    );
  }

  const timeText =
    `${String(
      Math.floor(seconds / 60)
    ).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;

  const answered =
    Object.keys(answers).length;

  /*
   * Current score while attempting.
   */
  const currentCorrect =
    questions.reduce(
      (sum, question, index) =>
        sum +
        (answers[index] ===
        question.correctOption
          ? 1
          : 0),
      0
    );

  const currentWrong = Math.max(
    0,
    answered - currentCorrect
  );

  const currentScore =
    currentCorrect * 3 -
    currentWrong;

  /*
   * Saved result.
   */
  const displayScore =
    attempt?.score ??
    currentScore;

  const displayCorrect =
    attempt?.correct ??
    currentCorrect;

  const displayWrong =
    attempt?.wrong ??
    currentWrong;

  /*
   * IMPORTANT:
   * Passage / DILR set is shown ONLY after Start
   * or after the student has already submitted.
   */
  const showTestContent =
    started || submitted;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

      {/* ------------------------------------------------ */}
      {/* HEADER */}
      {/* ------------------------------------------------ */}

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">
            Daily Practice ·{" "}
            {new Date(
              `${date}T12:00:00`
            ).toLocaleDateString(
              "en-IN",
              {
                day: "numeric",
                month: "short",
                year: "numeric",
              }
            )}
          </p>

          <h1 className="mt-1 font-display text-2xl font-bold">
            {title}
          </h1>

          <p className="mt-1 text-sm text-muted">
            {questions.length} questions · one attempt per day
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-start gap-3">

          <div className="hidden items-center gap-1.5 text-xs font-semibold text-muted sm:flex">
            <Users size={14} />
            {statsCount} attempted
          </div>

          {/* RESULT CARD */}
          {submitted ? (
            <div className="rounded-xl border border-brand/30 bg-brand-tint px-4 py-2.5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-darker">
                <Trophy size={12} />
                Score
              </div>

              <div className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-brand-dark">
                {displayScore}/{maximumMarks}
              </div>

              <div className="mt-0.5 text-[10px] font-semibold text-muted">
                {displayCorrect} correct ·{" "}
                {displayWrong} wrong
              </div>
            </div>
          ) : (
            /* TIMER */
            <div className="rounded-xl border border-border bg-white px-4 py-2.5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                <Clock3 size={12} />
                Time left
              </div>

              <div className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-brand-dark">
                {timeText}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ */}
      {/* RC PASSAGE */}
      {/* ONLY AFTER START */}
      {/* ------------------------------------------------ */}

      {showTestContent &&
        section === "varc" &&
        data.varc.type === "RC" && (
          <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">
              {data.varc.title ||
                "Reading Comprehension"}
            </h2>

            <div className="mt-4">
              <Content
                media={data.varc.passage}
                alt="RC passage"
              />
            </div>
          </div>
        )}

      {/* ------------------------------------------------ */}
      {/* DILR SET */}
      {/* ONLY AFTER START */}
      {/* ------------------------------------------------ */}

      {showTestContent &&
        section === "dilr" && (
          <div className="mt-6 rounded-2xl border border-border bg-white p-5 sm:p-6">
            <h2 className="font-display text-lg font-bold">
              {data.dilr.title ||
                "DILR Set"}
            </h2>

            <div className="mt-4">
              <Content
                media={data.dilr.set}
                alt="DILR set"
              />
            </div>
          </div>
        )}

      {/* ------------------------------------------------ */}
      {/* READY CARD */}
      {/* ------------------------------------------------ */}

      {!started && !submitted && (
        <div className="mt-6 rounded-2xl border border-border bg-white p-6 text-center">

          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand-darker">
            <Clock3 size={22} />
          </div>

          <h2 className="mt-3 font-display text-xl font-bold">
            Ready?
          </h2>

          <p className="mt-1 text-sm text-muted">
            You have{" "}
            <strong className="text-brand-darker">
              15 minutes
            </strong>{" "}
            for this section. You can leave the other sections for another time.
          </p>

          <button
            onClick={() => {
              setStarted(true);
              setSeconds(15 * 60);
            }}
            className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Start {sectionLabel(section)} Test
          </button>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* TIMER MESSAGE */}
      {/* ------------------------------------------------ */}

      {started && !submitted && (
        <div className="mt-5 rounded-xl border border-brand/20 bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-darker">
          Timer is running. When it reaches 00:00,
          your answers will be submitted automatically.
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* QUESTIONS */}
      {/* ------------------------------------------------ */}

      {showTestContent && (
        <div className="mt-5 space-y-5">

          {questions.map((q, i) => {
            const selected = answers[i];

            const correct =
              submitted &&
              selected === q.correctOption;

            return (
              <div
                key={i}
                className="rounded-2xl border border-border bg-white p-5 sm:p-6"
              >

                <div className="text-xs font-bold uppercase tracking-wide text-muted">
                  Question {i + 1}
                </div>

                {q.title && (
                  <h3 className="mt-1 font-display text-lg font-bold">
                    {q.title}
                  </h3>
                )}

                <div className="mt-4">
                  <Content
                    media={q.question}
                    alt={`Question ${i + 1}`}
                  />
                </div>

                {/* OPTIONS */}

                <div className="mt-6 grid gap-2.5">

                  {q.options.map(
                    (option) => {

                      const isCorrect =
                        submitted &&
                        option.label ===
                          q.correctOption;

                      const isWrong =
                        submitted &&
                        selected ===
                          option.label &&
                        option.label !==
                          q.correctOption;

                      return (
                        <button
                          key={option.label}
                          disabled={
                            !started ||
                            submitted
                          }
                          onClick={() =>
                            setAnswers(
                              (previous) => ({
                                ...previous,
                                [i]:
                                  option.label,
                              })
                            )
                          }
                          className={`rounded-xl border px-4 py-3 text-left transition ${
                            isCorrect
                              ? "border-brand bg-brand-tint"
                              : isWrong
                              ? "border-danger/40 bg-red-50"
                              : selected ===
                                option.label
                              ? "border-brand bg-brand-tint"
                              : "border-border hover:border-brand/50"
                          }`}
                        >
                          <div className="flex gap-3">

                            <span className="mt-0.5 shrink-0 font-semibold">
                              {option.label}.
                            </span>

                            <div className="min-w-0 flex-1">
                              <Content
                                media={
                                  option.content
                                }
                                alt={`Option ${option.label}`}
                              />
                            </div>

                            {isCorrect && (
                              <CheckCircle2
                                className="mt-0.5 shrink-0 text-brand"
                                size={18}
                              />
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}

                </div>

                {/* SOLUTION */}

                {submitted && (
                  <div className="mt-6 rounded-2xl bg-surface-muted p-5">

                    <p
                      className={`text-sm font-bold ${
                        correct
                          ? "text-brand-darker"
                          : "text-danger"
                      }`}
                    >
                      {correct
                        ? "Correct! +3 marks"
                        : `Incorrect — correct answer: ${q.correctOption} · -1 mark`}
                    </p>

                    {q.solution?.value && (
                      <div className="mt-5">
                        <p className="mb-2 text-xs font-semibold">
                          Solution
                        </p>

                        <Content
                          media={q.solution}
                          alt="Solution"
                        />
                      </div>
                    )}

                    {q.explanation?.value && (
                      <div className="mt-5 border-t border-border pt-4">
                        <p className="mb-2 text-xs font-semibold">
                          Explanation
                        </p>

                        <Content
                          media={
                            q.explanation
                          }
                          alt="Explanation"
                        />
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* SUBMIT BAR */}
      {/* ------------------------------------------------ */}

      {started && !submitted && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-lg">

          <span className="text-sm text-muted">
            Answered{" "}
            <strong className="text-foreground">
              {answered}/{questions.length}
            </strong>
          </span>

          <button
            disabled={saving}
            onClick={() =>
              submitAttempt(false)
            }
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : "Submit Section"}
          </button>
        </div>
      )}

      {/* ------------------------------------------------ */}
      {/* COMPLETED */}
      {/* NO SCORE HERE */}
      {/* ------------------------------------------------ */}

      {submitted && (
        <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-tint p-6 text-center">

          <p className="text-xs font-bold uppercase tracking-wide text-brand-darker">
            Section complete
          </p>

          <h2 className="mt-1 font-display text-xl font-bold">
            Your result has been saved.
          </h2>

          <p className="mt-1 text-sm text-muted">
            {displayCorrect} correct ·{" "}
            {displayWrong} wrong ·{" "}
            {statsCount} students attempted this section today.
          </p>

          <Link
            href="/daily"
            className="mt-5 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white"
          >
            Back to Daily Practice
          </Link>
        </div>
      )}
    </div>
  );
}
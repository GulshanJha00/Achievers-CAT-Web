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

const sectionLabel = (s: Section) =>
  s === "quant"
    ? "Quantitative Aptitude"
    : s === "varc"
      ? "VARC"
      : "DILR";

function Content({
  media,
  alt,
}: {
  media?: MediaValue;
  alt: string;
}) {
  if (!media?.value) return null;

  if (media.type === "image") {
    return (
      <AssetImage
        assetId={media.value}
        alt={alt}
      />
    );
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

  const requestedSection =
    (params?.get("section") || "quant") as Section;

  const section: Section =
    requestedSection === "quant" ||
    requestedSection === "varc" ||
    requestedSection === "dilr"
      ? requestedSection
      : "quant";

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [data, setData] = useState<Package | null>(null);
  const [attempt, setAttempt] = useState<any>(null);

  const [answers, setAnswers] = useState<
    Record<number, string>
  >({});

  const [seconds, setSeconds] = useState(15 * 60);

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [statsCount, setStatsCount] = useState(0);

  const date = useMemo(() => todayIST(), []);

  /*
   * --------------------------------------------------
   * AUTH
   * --------------------------------------------------
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * --------------------------------------------------
   * LOAD DAILY PACKAGE / ATTEMPT / STATS
   * --------------------------------------------------
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
          !cancelled &&
          packageSnap.exists() &&
          packageSnap.data().published !== false
        ) {
          setData(packageSnap.data() as Package);
        }

        const attemptId =
          `${date}_${section}_${user.uid}`;

        const attemptSnap = await getDoc(
          doc(db, "daily_attempts", attemptId)
        );

        if (!cancelled && attemptSnap.exists()) {
          const savedAttempt = attemptSnap.data();

          setAttempt(savedAttempt);

          /*
           * Restore previously selected answers so that
           * View Result shows what the student selected.
           */
          if (savedAttempt.answers) {
            const restoredAnswers: Record<number, string> =
              {};

            Object.entries(savedAttempt.answers).forEach(
              ([key, value]) => {
                restoredAnswers[Number(key)] = String(value);
              }
            );

            setAnswers(restoredAnswers);
          }

          setSubmitted(true);
        }

        const statSnap = await getDoc(
          doc(
            db,
            "daily_section_stats",
            `${date}_${section}`
          )
        );

        if (!cancelled && statSnap.exists()) {
          setStatsCount(
            Number(statSnap.data().count || 0)
          );
        }
      } catch (error) {
        console.error(
          "Could not load daily practice:",
          error
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, date, section]);

  /*
   * --------------------------------------------------
   * QUESTIONS
   *
   * RC -> maximum 4
   * VA -> maximum 5
   *
   * This also protects the student page if an admin
   * accidentally uploads more than the allowed number.
   * --------------------------------------------------
   */

  const questions = useMemo(() => {
    if (!data) return [];

    if (section === "quant") {
      return data.quant || [];
    }

    if (section === "varc") {
      if (data.varc.type === "RC") {
        return (data.varc.questions || []).slice(0, 4);
      }

      return (data.varc.questions || []).slice(0, 5);
    }

    return data.dilr.questions || [];
  }, [data, section]);

  const title = useMemo(() => {
    if (!data) {
      return sectionLabel(section);
    }

    if (section === "quant") {
      return "Quantitative Aptitude";
    }

    if (section === "varc") {
      return data.varc.type === "VA"
        ? "VA of the Day"
        : "RC of the Day";
    }

    return "DILR Set of the Day";
  }, [data, section]);

  /*
   * --------------------------------------------------
   * TIMER
   * --------------------------------------------------
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

    return () =>
      window.clearInterval(intervalId);

    // submitAttempt is intentionally excluded because
    // the timer must not restart whenever the function
    // reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted, seconds]);

  /*
   * --------------------------------------------------
   * SUBMIT
   *
   * Correct = +3
   * Wrong   = -1
   * Blank   = 0
   *
   * Leaderboard entry is created in the SAME transaction
   * as the daily attempt.
   * --------------------------------------------------
   */

  async function submitAttempt(auto = false) {
    if (
      !user ||
      !data ||
      submitted ||
      saving ||
      questions.length === 0
    ) {
      return;
    }

    setSaving(true);

    const answeredIndexes = Object.keys(answers);

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

    const answeredCount = answeredIndexes.length;

    const wrong = Math.max(
      0,
      answeredCount - correct
    );

    const total = questions.length;

    /*
     * CAT-style marking:
     *
     * Correct = +3
     * Wrong   = -1
     * Unanswered = 0
     */
    const score = correct * 3 - wrong;

    const attemptId =
      `${date}_${section}_${user.uid}`;

    const statId =
      `${date}_${section}`;

    /*
     * IMPORTANT:
     *
     * This is the corrected leaderboard structure:
     *
     * daily_leaderboards
     *   └── 2026-08-27_quant
     *       └── entries
     *           └── USER_UID
     *
     * NOT:
     *
     * daily_leaderboards/2026-08-27/quant/entries
     */
    const leaderboardEntryRef = doc(
      db,
      "daily_leaderboards",
      `${date}_${section}`,
      "entries",
      user.uid
    );

    try {
      await runTransaction(db, async (transaction) => {
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
         * Read everything before writing anything.
         */

        const attemptSnap =
          await transaction.get(attemptRef);

        const statSnap =
          await transaction.get(statRef);

        /*
         * If the attempt already exists, do not count it
         * again.
         */
        if (attemptSnap.exists()) {
          return;
        }

        const currentCount = statSnap.exists()
          ? Number(
              statSnap.data().count || 0
            )
          : 0;

        /*
         * DAILY ATTEMPT
         */

        transaction.set(attemptRef, {
          userId: user.uid,
          email: user.email || "",
          displayName:
            user.displayName || "",
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
         * DAILY SECTION COUNTER
         */

        transaction.set(
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
         * LEADERBOARD
         */

        transaction.set(
          leaderboardEntryRef,
          {
            userId: user.uid,
            email: user.email || "",
            displayName:
              user.displayName || "",

            date,
            section,

            score,
            correct,
            wrong,
            total,

            updatedAt:
              serverTimestamp(),
          }
        );
      });

      /*
       * Reload saved attempt.
       */

      const savedAttempt =
        await getDoc(
          doc(
            db,
            "daily_attempts",
            attemptId
          )
        );

      if (savedAttempt.exists()) {
        setAttempt(
          savedAttempt.data()
        );
      }

      /*
       * Reload live count.
       */

      const statSnap =
        await getDoc(
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
        "Could not save daily attempt:",
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
   * --------------------------------------------------
   * LOADING / AUTH
   * --------------------------------------------------
   */

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

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

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">
          Today&apos;s practice is being prepared.
        </h1>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * DISPLAY VALUES
   * --------------------------------------------------
   */

  const timeText =
    `${String(Math.floor(seconds / 60)).padStart(
      2,
      "0"
    )}:${String(seconds % 60).padStart(2, "0")}`;

  const answered =
    Object.keys(answers).length;

  const finalScore =
    attempt?.score ??
    0;

  const finalCorrect =
    attempt?.correct ??
    0;

  const finalWrong =
    attempt?.wrong ??
    0;

  /*
   * --------------------------------------------------
   * PAGE
   * --------------------------------------------------
   */

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      {/* --------------------------------------------------
          HEADER
      -------------------------------------------------- */}

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

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>
              {questions.length} questions
            </span>

            <span>·</span>

            <span>
              one attempt per day
            </span>

            <span>·</span>

            <span className="font-semibold text-brand-darker">
              +3 correct
            </span>

            <span>·</span>

            <span className="font-semibold text-danger">
              −1 wrong
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* ATTEMPT COUNT */}

          <div className="hidden items-center gap-1.5 text-xs font-semibold text-muted sm:flex">
            <Users size={14} />
            {statsCount} attempted
          </div>

          {/* SCORE AFTER SUBMIT */}

          {submitted ? (
            <div className="rounded-xl border border-brand/30 bg-brand-tint px-4 py-2.5 text-center shadow-sm">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand-darker">
                <Trophy size={12} />
                Score
              </div>

              <div className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-brand-dark">
                {finalScore}/
                {questions.length * 3}
              </div>
            </div>
          ) : (
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

      {/* --------------------------------------------------
          RC PASSAGE
          
          IMPORTANT:
          It is ONLY rendered after Start.
      -------------------------------------------------- */}

      {started &&
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

      {/* --------------------------------------------------
          DILR SET
          
          Hidden until test starts as well, so students
          don't see the actual set before beginning.
      -------------------------------------------------- */}

      {started &&
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

      {/* --------------------------------------------------
          READY SCREEN
      -------------------------------------------------- */}

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
            for this section. You can leave the other
            sections for another time.
          </p>

          <p className="mt-3 text-xs font-semibold text-muted">
            Marking: +3 correct · −1 wrong · 0 unanswered
          </p>

          <button
            onClick={() => setStarted(true)}
            className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Start {sectionLabel(section)} Test
          </button>
        </div>
      )}

      {/* --------------------------------------------------
          TIMER MESSAGE
      -------------------------------------------------- */}

      {started && !submitted && (
        <div className="mt-5 rounded-xl border border-brand/20 bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-darker">
          Timer is running. When it reaches 00:00, your
          answers will be submitted automatically.
        </div>
      )}

      {/* --------------------------------------------------
          QUESTIONS
      -------------------------------------------------- */}

      <div className="mt-5 space-y-5">
        {questions.map((q, i) => {
          const selected = answers[i];

          const isCorrect =
            submitted &&
            selected === q.correctOption;

          const isWrong =
            submitted &&
            !!selected &&
            selected !== q.correctOption;

          return (
            <div
              key={i}
              className="rounded-2xl border border-border bg-white p-5 sm:p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-xs font-bold uppercase tracking-wide text-muted">
                  Question {i + 1}
                </div>

                {/* MARKING */}

                {!submitted ? (
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-brand-tint px-2 py-1 text-brand-darker">
                      +3
                    </span>

                    <span className="rounded-full bg-red-50 px-2 py-1 text-danger">
                      −1
                    </span>
                  </div>
                ) : (
                  <div
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      isCorrect
                        ? "bg-brand-tint text-brand-darker"
                        : isWrong
                          ? "bg-red-50 text-danger"
                          : "bg-surface-muted text-muted"
                    }`}
                  >
                    {isCorrect
                      ? "+3"
                      : isWrong
                        ? "−1"
                        : "0"}
                  </div>
                )}
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
                {q.options.map((option) => {
                  const optionIsCorrect =
                    submitted &&
                    option.label ===
                      q.correctOption;

                  const optionIsWrong =
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
                        setAnswers((previous) => ({
                          ...previous,
                          [i]: option.label,
                        }))
                      }
                      className={`rounded-xl border px-4 py-3 text-left transition ${
                        optionIsCorrect
                          ? "border-brand bg-brand-tint"
                          : optionIsWrong
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

                        {optionIsCorrect && (
                          <CheckCircle2
                            className="mt-0.5 shrink-0 text-brand"
                            size={18}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* SOLUTION AFTER SUBMISSION */}

              {submitted && (
                <div className="mt-6 rounded-2xl bg-surface-muted p-5">
                  <p
                    className={`text-sm font-bold ${
                      isCorrect
                        ? "text-brand-darker"
                        : selected
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {isCorrect
                      ? "Correct! +3 marks"
                      : selected
                        ? `Incorrect — ${q.correctOption} was the correct answer. −1 mark`
                        : `Not attempted — correct answer: ${q.correctOption}`}
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
                        media={q.explanation}
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

      {/* --------------------------------------------------
          SUBMIT BAR
      -------------------------------------------------- */}

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

      {/* --------------------------------------------------
          RESULT HEADER / SUMMARY
          
          Score is deliberately NOT shown underneath all
          questions. The main score is in the top-right.
      -------------------------------------------------- */}

      {submitted && (
        <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-tint p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-darker">
                Section complete
              </p>

              <p className="mt-1 text-sm text-muted">
                {finalCorrect} correct ·{" "}
                {finalWrong} wrong ·{" "}
                {Math.max(
                  0,
                  questions.length -
                    finalCorrect -
                    finalWrong
                )}{" "}
                unanswered
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Your Score
              </p>

              <p className="font-display text-2xl font-bold text-brand-darker">
                {finalScore}/
                {questions.length * 3}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/daily"
              className="inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-white"
            >
              Back to Daily Practice
            </Link>

            <Link
              href="/"
              className="inline-flex rounded-full border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground"
            >
              View Live Rankings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
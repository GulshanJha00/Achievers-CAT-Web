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
} from "lucide-react";
import Link from "next/link";


// ============================================================
// TYPES
// ============================================================

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


// ============================================================
// HELPERS
// ============================================================

const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());


const sectionLabel = (section: Section) => {
  if (section === "quant") return "Quantitative Aptitude";
  if (section === "varc") return "VARC";
  return "DILR";
};


// ============================================================
// CONTENT RENDERER
// ============================================================

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


// ============================================================
// PAGE
// ============================================================

export default function DailyQuestionPage() {

  // ----------------------------------------------------------
  // SECTION
  // ----------------------------------------------------------

  const params =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;

  const requestedSection = params?.get("section");

  const section: Section =
    requestedSection === "varc"
      ? "varc"
      : requestedSection === "dilr"
        ? "dilr"
        : "quant";


  // ----------------------------------------------------------
  // STATE
  // ----------------------------------------------------------

  const [user, setUser] = useState<any>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [data, setData] =
    useState<Package | null>(null);

  const [attempt, setAttempt] =
    useState<any>(null);

  const [answers, setAnswers] =
    useState<Record<number, string>>({});

  const [seconds, setSeconds] =
    useState(15 * 60);

  const [started, setStarted] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [statsCount, setStatsCount] =
    useState(0);

  const [loadingData, setLoadingData] =
    useState(true);


  const date = useMemo(
    todayIST,
    []
  );


  // ==========================================================
  // AUTH
  // ==========================================================

  useEffect(() => {
    return onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );
  }, []);


  // ==========================================================
  // LOAD DAILY DATA
  // ==========================================================

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadData() {
      try {
        setLoadingData(true);

        // ----------------------------------------------------
        // Daily package
        // ----------------------------------------------------

        const packageSnap = await getDoc(
          doc(db, "daily_packages", date)
        );

        if (!cancelled) {
          if (
            packageSnap.exists() &&
            packageSnap.data().published !== false
          ) {
            setData(
              packageSnap.data() as Package
            );
          } else {
            setData(null);
          }
        }


        // ----------------------------------------------------
        // Existing attempt
        // ----------------------------------------------------

        const attemptId =
          `${date}_${section}_${user.uid}`;

        const attemptSnap = await getDoc(
          doc(
            db,
            "daily_attempts",
            attemptId
          )
        );

        if (!cancelled && attemptSnap.exists()) {
          const attemptData =
            attemptSnap.data();

          setAttempt(attemptData);
          setSubmitted(true);
          setStarted(false);

          // Restore saved answers when available.
          if (
            attemptData.answers &&
            typeof attemptData.answers === "object"
          ) {
            setAnswers(
              attemptData.answers
            );
          }
        }


        // ----------------------------------------------------
        // Section statistics
        // ----------------------------------------------------

        const statId =
          `${date}_${section}`;

        const statSnap = await getDoc(
          doc(
            db,
            "daily_section_stats",
            statId
          )
        );

        if (!cancelled) {
          if (statSnap.exists()) {
            setStatsCount(
              Number(
                statSnap.data().count || 0
              )
            );
          } else {
            setStatsCount(0);
          }
        }

      } catch (error) {
        console.error(
          "Error loading daily practice:",
          error
        );
      } finally {
        if (!cancelled) {
          setLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };

  }, [
    user,
    date,
    section,
  ]);


  // ==========================================================
  // QUESTIONS
  // ==========================================================

  const questions: MCQ[] =
    !data
      ? []
      : section === "quant"
        ? data.quant || []
        : section === "varc"
          ? data.varc?.questions || []
          : data.dilr?.questions || [];


  // ==========================================================
  // TITLE
  // ==========================================================

  const title =
    !data
      ? sectionLabel(section)
      : section === "quant"
        ? "Quantitative Aptitude"
        : section === "varc"
          ? (
            data.varc?.type === "VA"
              ? "VA of the Day"
              : "RC of the Day"
          )
          : "DILR Set of the Day";


  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {

    if (!started || submitted) {
      return;
    }

    if (seconds <= 0) {
      submitAttempt(true);
      return;
    }

    const timerId =
      window.setInterval(() => {

        setSeconds(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );

      }, 1000);

    return () =>
      window.clearInterval(timerId);

    // submitAttempt intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    started,
    submitted,
    seconds,
  ]);


  // ==========================================================
  // START TEST
  // ==========================================================

  function startTest() {

    if (submitted) return;

    // Always start with a fresh 15 minutes.
    setSeconds(15 * 60);

    setStarted(true);
  }


  // ==========================================================
  // SUBMIT TEST
  // ==========================================================

  async function submitAttempt(
    auto = false
  ) {

    if (
      !user ||
      !data ||
      submitted ||
      saving
    ) {
      return;
    }

    setSaving(true);

    // --------------------------------------------------------
    // Calculate score
    // --------------------------------------------------------

    const correct =
      questions.reduce(
        (sum, question, index) => {

          return (
            sum +
            (
              answers[index] ===
              question.correctOption
                ? 1
                : 0
            )
          );

        },
        0
      );

    const total =
      questions.length;

    const score =
      correct;


    // --------------------------------------------------------
    // IDs
    // --------------------------------------------------------

    const attemptId =
      `${date}_${section}_${user.uid}`;

    const statId =
      `${date}_${section}`;


    try {

      await runTransaction(
        db,
        async (transaction) => {

          // --------------------------------------------------
          // References
          // --------------------------------------------------

          const attemptRef =
            doc(
              db,
              "daily_attempts",
              attemptId
            );

          const statRef =
            doc(
              db,
              "daily_section_stats",
              statId
            );


          // --------------------------------------------------
          // READS MUST HAPPEN BEFORE WRITES
          // --------------------------------------------------

          const existingAttempt =
            await transaction.get(
              attemptRef
            );

          const existingStats =
            await transaction.get(
              statRef
            );


          // --------------------------------------------------
          // Already submitted?
          // --------------------------------------------------

          if (
            existingAttempt.exists()
          ) {
            return;
          }


          // --------------------------------------------------
          // Current attempt count
          // --------------------------------------------------

          const currentCount =
            existingStats.exists()
              ? Number(
                existingStats.data()
                  .count || 0
              )
              : 0;


          // --------------------------------------------------
          // Save attempt
          // --------------------------------------------------

          transaction.set(
            attemptRef,
            {
              userId: user.uid,

              email:
                user.email || "",

              displayName:
                user.displayName || "",

              date,

              section,

              score,

              correct,

              total,

              answers,

              timeTakenSeconds:
                Math.max(
                  0,
                  (15 * 60) -
                  seconds
                ),

              timedOut: auto,

              submittedAt:
                serverTimestamp(),
            }
          );


          // --------------------------------------------------
          // Update attempt count
          // --------------------------------------------------

          if (
            existingStats.exists()
          ) {

            transaction.update(
              statRef,
              {
                count:
                  currentCount + 1,

                updatedAt:
                  serverTimestamp(),
              }
            );

          } else {

            transaction.set(
              statRef,
              {
                date,

                section,

                count: 1,

                updatedAt:
                  serverTimestamp(),
              }
            );
          }

        }
      );


      // ======================================================
      // READ SAVED RESULT
      // ======================================================

      const savedAttempt =
        await getDoc(
          doc(
            db,
            "daily_attempts",
            attemptId
          )
        );

      if (
        savedAttempt.exists()
      ) {
        setAttempt(
          savedAttempt.data()
        );
      }


      // ======================================================
      // READ UPDATED COUNT
      // ======================================================

      const savedStats =
        await getDoc(
          doc(
            db,
            "daily_section_stats",
            statId
          )
        );

      if (
        savedStats.exists()
      ) {
        setStatsCount(
          Number(
            savedStats.data()
              .count || 0
          )
        );
      }


      // ======================================================
      // FINISH
      // ======================================================

      setSubmitted(true);
      setStarted(false);

    } catch (error) {

      console.error(
        "DAILY SUBMISSION ERROR:",
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


  // ==========================================================
  // LOADING STATES
  // ==========================================================

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="animate-spin text-brand"
        />
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


  if (loadingData) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="animate-spin text-brand"
        />
      </div>
    );
  }


  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">

        <h1 className="font-display text-2xl font-bold">
          Today&apos;s practice is being prepared.
        </h1>

        <p className="mt-2 text-sm text-muted">
          Please check back shortly.
        </p>

        <Link
          href="/daily"
          className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Daily Practice
        </Link>

      </div>
    );
  }


  // ==========================================================
  // DISPLAY VALUES
  // ==========================================================

  const timeText =
    `${String(
      Math.floor(seconds / 60)
    ).padStart(2, "0")}:${String(
      seconds % 60
    ).padStart(2, "0")}`;


  const answered =
    Object.keys(answers).length;


  const displayScore =
    attempt?.score ??
    questions.reduce(
      (sum, question, index) =>
        sum +
        (
          answers[index] ===
          question.correctOption
            ? 1
            : 0
        ),
      0
    );


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

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


        <div className="flex items-center gap-3">

          {/* Attempt count */}

          <div className="hidden items-center gap-1.5 text-xs font-semibold text-muted sm:flex">

            <Users size={14} />

            {statsCount} attempted

          </div>


          {/* Timer */}

          <div className="rounded-xl border border-border bg-white px-4 py-2.5 text-center shadow-sm">

            <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted">

              <Clock3 size={12} />

              Time left

            </div>

            <div className="mt-0.5 font-mono text-xl font-extrabold tabular-nums text-brand-dark">

              {timeText}

            </div>

          </div>

        </div>

      </div>


      {/* =====================================================
          RC / DILR MATERIAL
          Hidden until test starts
      ===================================================== */}

      {(started || submitted) && (
        <>

          {/* RC passage */}

          {section === "varc" &&
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


          {/* DILR set */}

          {section === "dilr" && (

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

        </>
      )}


      {/* =====================================================
          START SCREEN
      ===================================================== */}

      {!started &&
        !submitted && (

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
              </strong>

              {" "}for this section.

              You can leave the other sections
              for another time.

            </p>


            <button
              onClick={startTest}
              className="mt-5 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark"
            >
              Start {sectionLabel(section)} Test
            </button>

          </div>
        )}


      {/* =====================================================
          TIMER RUNNING MESSAGE
      ===================================================== */}

      {started &&
        !submitted && (

          <div className="mt-5 rounded-xl border border-brand/20 bg-brand-tint px-4 py-3 text-sm font-semibold text-brand-darker">

            Timer is running.

            {" "}When it reaches 00:00,
            your answers will be submitted automatically.

          </div>
        )}


      {/* =====================================================
          QUESTIONS
          IMPORTANT:
          Hidden before Start
      ===================================================== */}

      {(started || submitted) && (

        <div className="mt-5 space-y-5">

          {questions.map(
            (question, index) => {

              const selected =
                answers[index];

              const isSubmitted =
                submitted;

              const correct =
                isSubmitted &&
                selected ===
                  question.correctOption;


              return (

                <div
                  key={index}
                  className="rounded-2xl border border-border bg-white p-5 sm:p-6"
                >

                  {/* Question number */}

                  <div className="text-xs font-bold uppercase tracking-wide text-muted">

                    Question {index + 1}

                  </div>


                  {/* Optional title */}

                  {question.title && (

                    <h3 className="mt-1 font-display text-lg font-bold">

                      {question.title}

                    </h3>

                  )}


                  {/* Question */}

                  <div className="mt-4">

                    <Content
                      media={question.question}
                      alt={`Question ${index + 1}`}
                    />

                  </div>


                  {/* Options */}

                  <div className="mt-6 grid gap-2.5">

                    {question.options.map(
                      (option) => {

                        const isCorrect =
                          isSubmitted &&
                          option.label ===
                            question.correctOption;

                        const isWrong =
                          isSubmitted &&
                          selected ===
                            option.label &&
                          option.label !==
                            question.correctOption;


                        return (

                          <button
                            key={option.label}
                            type="button"
                            disabled={
                              !started ||
                              submitted
                            }
                            onClick={() =>
                              setAnswers(
                                (current) => ({
                                  ...current,
                                  [index]:
                                    option.label,
                                })
                              )
                            }
                            className={`rounded-xl border px-4 py-3 text-left transition ${
                              isCorrect
                                ? "border-brand bg-brand-tint"
                                : isWrong
                                  ? "border-danger/40 bg-red-50"
                                  : selected === option.label
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
                                  media={option.content}
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


                  {/* =================================================
                      SOLUTION AFTER SUBMISSION
                  ================================================= */}

                  {isSubmitted && (

                    <div className="mt-6 rounded-2xl bg-surface-muted p-5">

                      <p
                        className={`text-sm font-bold ${
                          correct
                            ? "text-brand-darker"
                            : "text-danger"
                        }`}
                      >

                        {correct
                          ? "Correct!"
                          : `Incorrect — correct answer: ${question.correctOption}`}

                      </p>


                      {question.solution?.value && (

                        <div className="mt-5">

                          <p className="mb-2 text-xs font-semibold">
                            Solution
                          </p>

                          <Content
                            media={question.solution}
                            alt="Solution"
                          />

                        </div>

                      )}


                      {question.explanation?.value && (

                        <div className="mt-5 border-t border-border pt-4">

                          <p className="mb-2 text-xs font-semibold">
                            Explanation
                          </p>

                          <Content
                            media={
                              question.explanation
                            }
                            alt="Explanation"
                          />

                        </div>

                      )}

                    </div>

                  )}

                </div>

              );
            }
          )}

        </div>

      )}


      {/* =====================================================
          SUBMIT BAR
      ===================================================== */}

      {started &&
        !submitted && (

          <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-lg">

            <span className="text-sm text-muted">

              Answered{" "}

              <strong className="text-foreground">
                {answered}/{questions.length}
              </strong>

            </span>


            <button
              type="button"
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


      {/* =====================================================
          RESULT
      ===================================================== */}

      {submitted && (

        <div className="mt-6 rounded-2xl border border-brand/30 bg-brand-tint p-6 text-center">

          <p className="text-xs font-bold uppercase tracking-wide text-brand-darker">
            Section complete
          </p>


          <h2 className="mt-1 font-display text-2xl font-bold">

            Score: {displayScore}/{questions.length}

          </h2>


          <p className="mt-1 text-sm text-muted">

            {attempt?.correct ??
              displayScore}

            {" "}correct ·{" "}

            {statsCount}

            {" "}people have attempted
            this section today.

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
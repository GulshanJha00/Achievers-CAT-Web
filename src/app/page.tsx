"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

import {
  ArrowRight,
  Flame,
  CheckCircle2,
  Circle,
  BookOpenText,
  ListChecks,
  FileStack,
  FolderOpen,
  LogIn,
  Target,
  Download,
  Trophy,
  Users,
  Loader2,
} from "lucide-react";

import { auth, db } from "@/lib/firebase/client";

type Section =
  | "quant"
  | "varc"
  | "dilr";

type DailyAttempt = {
  score?: number;
  correct?: number;
  wrong?: number;
  total?: number;
  section?: string;
};

type DailyPackage = {
  published?: boolean;

  quant?: unknown[];

  varc?: {
    type?: "RC" | "VA";
    questions?: unknown[];
  };

  dilr?: {
    questions?: unknown[];
  };
};

type LeaderboardEntry = {
  userId: string;
  displayName?: string;
  score?: number;
  correct?: number;
  wrong?: number;
  total?: number;
};

type LeaderboardState = {
  entries: LeaderboardEntry[];
  loading: boolean;
};

const features = [
  {
    href: "/daily",
    icon: Target,
    title: "Daily Practice",
    desc: "Question of the Day, RC of the Day, and daily targets to build a streak.",
  },
  {
    href: "/sectional",
    icon: ListChecks,
    title: "Sectional Mocks",
    desc: "Focused VARC, DILR and QA sectionals to sharpen individual areas.",
  },
  {
    href: "/mocks",
    icon: FileStack,
    title: "Full Mocks",
    desc: "Complete CAT-pattern mocks with a real exam-style interface and timer.",
  },
  {
    href: "/materials",
    icon: FolderOpen,
    title: "Materials",
    desc: "Notes and PDFs by section, ready to download and revise from.",
  },
];

const steps = [
  {
    n: "01",
    icon: LogIn,
    title: "Continue with Google",
    desc: "Sign in with your Gmail account — no separate password to remember.",
  },
  {
    n: "02",
    icon: BookOpenText,
    title: "Practice daily, attempt mocks",
    desc: "Work through daily targets, sectional mocks, or a full CAT-pattern mock.",
  },
  {
    n: "03",
    icon: Download,
    title: "Track your score",
    desc: "See section-wise accuracy after every attempt and download your scorecard.",
  },
];

const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

/*
 * RC = 4
 * VA = 5
 */
function getQuestionCount(
  data: DailyPackage | null,
  section: Section
) {
  if (!data) {
    if (section === "varc") return 4;
    return 5;
  }

  if (section === "quant") {
    return Math.min(
      data.quant?.length || 5,
      5
    );
  }

  if (section === "varc") {
    const uploaded =
      data.varc?.questions?.length || 0;

    if (data.varc?.type === "RC") {
      return Math.min(uploaded, 4);
    }

    return Math.min(uploaded, 5);
  }

  return data.dilr?.questions?.length || 5;
}

/*
 * Leaderboard sorting:
 *
 * 1. Highest score
 * 2. Highest correct count
 * 3. Lowest wrong count
 */
function sortLeaderboard(
  entries: LeaderboardEntry[]
) {
  return [...entries].sort(
    (a, b) => {
      const scoreDifference =
        Number(b.score || 0) -
        Number(a.score || 0);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      const correctDifference =
        Number(b.correct || 0) -
        Number(a.correct || 0);

      if (correctDifference !== 0) {
        return correctDifference;
      }

      return (
        Number(a.wrong || 0) -
        Number(b.wrong || 0)
      );
    }
  );
}

function LeaderboardCard({
  title,
  state,
  currentUserId,
}: {
  title: string;
  state: LeaderboardState;
  currentUserId?: string;
}) {
  const sorted =
    sortLeaderboard(state.entries);

  const topTen =
    sorted.slice(0, 10);

  const total =
    state.entries.length;

  return (
    <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">

      <div className="flex items-center justify-between gap-3">

        <div>
          <p className="font-display text-lg font-bold text-foreground">
            {title}
          </p>

          <p className="mt-1 text-xs font-semibold text-brand-dark">
            Top 10/{total}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-darker">
          <Trophy size={19} />
        </div>

      </div>

      <div className="mt-4 border-t border-border pt-3">

        {state.loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-brand" size={20} />
          </div>
        ) : topTen.length === 0 ? (
          <div className="py-8 text-center">
            <Users
              size={22}
              className="mx-auto text-muted"
            />

            <p className="mt-2 text-sm text-muted">
              No attempts yet today.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">

            {topTen.map(
              (entry, index) => {
                const isCurrentUser =
                  entry.userId ===
                  currentUserId;

                const score =
                  Number(
                    entry.score || 0
                  );

                return (
                  <div
                    key={entry.userId}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                      isCurrentUser
                        ? "bg-brand-tint"
                        : "bg-surface-muted"
                    }`}
                  >

                    <div className="w-6 shrink-0 text-center font-display text-sm font-bold text-muted">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">

                      <p
                        className={`truncate text-sm font-semibold ${
                          isCurrentUser
                            ? "text-brand-darker"
                            : "text-foreground"
                        }`}
                      >
                        {entry.displayName ||
                          "Student"}

                        {isCurrentUser &&
                          " (You)"}
                      </p>

                      <p className="text-[11px] text-muted">
                        {Number(
                          entry.correct || 0
                        )} correct ·{" "}
                        {Number(
                          entry.wrong || 0
                        )} wrong
                      </p>

                    </div>

                    <div className="shrink-0 text-right">

                      <p className="font-display text-sm font-bold text-brand-dark">
                        {score}
                      </p>

                      <p className="text-[10px] text-muted">
                        marks
                      </p>

                    </div>

                  </div>
                );
              }
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] =
    useState<any>(null);

  const [authLoading, setAuthLoading] =
    useState(true);

  const [dailyData, setDailyData] =
    useState<DailyPackage | null>(null);

  const [attempts, setAttempts] =
    useState<Record<
      Section,
      DailyAttempt | null
    >>({
      quant: null,
      varc: null,
      dilr: null,
    });

  const [leaderboards, setLeaderboards] =
    useState<
      Record<
        Section,
        LeaderboardState
      >
    >({
      quant: {
        entries: [],
        loading: true,
      },
      varc: {
        entries: [],
        loading: true,
      },
      dilr: {
        entries: [],
        loading: true,
      },
    });

  const date = useMemo(
    todayIST,
    []
  );

  /*
   * AUTH
   */
  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
        auth,
        (currentUser) => {
          setUser(currentUser);
          setAuthLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  /*
   * DAILY PACKAGE
   */
  useEffect(() => {
    if (!user) return;

    const packageRef = doc(
      db,
      "daily_packages",
      date
    );

    const unsubscribe =
      onSnapshot(
        packageRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setDailyData(
              snapshot.data() as DailyPackage
            );
          } else {
            setDailyData(null);
          }
        },
        (error) => {
          console.error(
            "Daily package listener:",
            error
          );
        }
      );

    return () => unsubscribe();
  }, [user, date]);

  /*
   * PERSONAL DAILY ATTEMPTS
   *
   * These are realtime, so if the student
   * completes a section, the homepage updates
   * immediately.
   */
  useEffect(() => {
    if (!user) {
      setAttempts({
        quant: null,
        varc: null,
        dilr: null,
      });

      return;
    }

    const sections: Section[] = [
      "quant",
      "varc",
      "dilr",
    ];

    const unsubscribes =
      sections.map((section) => {
        const attemptRef = doc(
          db,
          "daily_attempts",
          `${date}_${section}_${user.uid}`
        );

        return onSnapshot(
          attemptRef,
          (snapshot) => {
            setAttempts(
              (previous) => ({
                ...previous,
                [section]:
                  snapshot.exists()
                    ? (snapshot.data() as DailyAttempt)
                    : null,
              })
            );
          },
          (error) => {
            console.error(
              `Attempt listener ${section}:`,
              error
            );
          }
        );
      });

    return () => {
      unsubscribes.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [user, date]);

  /*
   * LIVE LEADERBOARDS
   *
   * We listen to every entry for today's section.
   *
   * This gives us:
   *
   * - live total number of attempters
   * - live ranking
   * - live Top 10
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const sections: Section[] = [
      "quant",
      "varc",
      "dilr",
    ];

    const unsubscribes =
      sections.map((section) => {
        const entriesRef =
          collection(
            db,
            "daily_leaderboards",
            date,
            section,
            "entries"
          );

        return onSnapshot(
          entriesRef,
          (snapshot) => {
            const entries =
              snapshot.docs.map(
                (entryDoc) =>
                  entryDoc.data() as LeaderboardEntry
              );

            setLeaderboards(
              (previous) => ({
                ...previous,
                [section]: {
                  entries,
                  loading: false,
                },
              })
            );
          },
          (error) => {
            console.error(
              `Leaderboard listener ${section}:`,
              error
            );

            setLeaderboards(
              (previous) => ({
                ...previous,
                [section]: {
                  entries: [],
                  loading: false,
                },
              })
            );
          }
        );
      });

    return () => {
      unsubscribes.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [user, date]);

  /*
   * CALCULATE DAILY TARGET
   */
  const sectionList: Section[] = [
    "quant",
    "varc",
    "dilr",
  ];

  const completedCount =
    sectionList.filter(
      (section) =>
        attempts[section] !== null
    ).length;

  const progress =
    completedCount / 3;

  const circleDashOffset =
    97.4 -
    97.4 * progress;

  const quantQuestions =
    getQuestionCount(
      dailyData,
      "quant"
    );

  const varcQuestions =
    getQuestionCount(
      dailyData,
      "varc"
    );

  const dilrQuestions =
    getQuestionCount(
      dailyData,
      "dilr"
    );

  const targetItems = [
    {
      section: "quant" as Section,
      title: "Quantitative Aptitude",
      count: quantQuestions,
      href: "/daily/question?section=quant",
    },
    {
      section: "varc" as Section,
      title:
        dailyData?.varc?.type ===
        "VA"
          ? "VA of the Day"
          : "RC of the Day",
      count: varcQuestions,
      href: "/daily/question?section=varc",
    },
    {
      section: "dilr" as Section,
      title: "DILR Set of the Day",
      count: dilrQuestions,
      href: "/daily/question?section=dilr",
    },
  ];

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>

      {/* ================================================= */}
      {/* HERO */}
      {/* ================================================= */}

      <section className="relative overflow-hidden border-b border-border">

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">

          <div>

            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-brand-tint px-3 py-1 text-[12.5px] font-medium text-brand-darker">
              <Flame
                size={13}
                className="text-flame"
              />
              Built for CAT 2026 aspirants
            </div>

            <h1 className="mt-5 font-display text-[2.5rem] font-bold leading-[1.08] tracking-tight text-foreground sm:text-[3.2rem]">
              Prepare smarter.
              <br />
              Practice{" "}
              <span className="text-brand-dark">
                consistently
              </span>
              .
            </h1>

            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-muted">
              Daily questions, sectional and full CAT-pattern mocks, and study
              material — with your streak, scores and scorecards tracked in
              one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">

              <Link
                href="/daily"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark"
              >
                Start Practising{" "}
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/mocks"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-[14.5px] font-semibold text-foreground transition hover:border-brand hover:text-brand-darker"
              >
                Attempt a Mock
              </Link>

            </div>
          </div>

          {/* ================================================= */}
          {/* TODAY'S TARGET */}
          {/* ================================================= */}

          <div className="relative">

            <div className="rounded-2xl border border-border bg-white p-5 shadow-xl shadow-black/[0.04] sm:p-6">

              <div className="flex items-center justify-between">

                <p className="font-display text-[15px] font-semibold text-foreground">
                  Today&apos;s Target
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[12px] font-semibold text-brand-darker">
                  <Flame
                    size={12}
                    className="text-flame"
                  />
                  7-day streak
                </span>

              </div>

              {/* PROGRESS */}

              <div className="mt-4 flex items-center gap-4">

                <div className="relative h-16 w-16 shrink-0">

                  <svg
                    viewBox="0 0 36 36"
                    className="h-16 w-16 -rotate-90"
                  >
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#e6ebe8"
                      strokeWidth="3.5"
                    />

                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="3.5"
                      strokeDasharray="97.4"
                      strokeDashoffset={
                        circleDashOffset
                      }
                      strokeLinecap="round"
                    />
                  </svg>

                  <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-bold text-foreground">
                    {completedCount}/3
                  </span>

                </div>

                <p className="text-[13.5px] leading-snug text-muted">
                  Complete today&apos;s target to keep your streak alive.
                </p>

              </div>

              {/* TARGET LIST */}

              <ul className="mt-5 space-y-2.5 border-t border-border pt-4">

                {targetItems.map(
                  (item) => {
                    const attempt =
                      attempts[
                        item.section
                      ];

                    const completed =
                      attempt !== null;

                    const maximumMarks =
                      item.count * 3;

                    return (
                      <li
                        key={item.section}
                        className="flex items-center gap-2.5 text-[14px]"
                      >

                        {completed ? (
                          <CheckCircle2
                            size={17}
                            className="shrink-0 text-brand"
                          />
                        ) : (
                          <Circle
                            size={17}
                            className="shrink-0 text-border"
                          />
                        )}

                        <Link
                          href={item.href}
                          className={`min-w-0 flex-1 ${
                            completed
                              ? "text-foreground"
                              : "text-muted"
                          } hover:text-brand-darker`}
                        >
                          {item.title}
                        </Link>

                        {/* SCORE ON RIGHT */}

                        {completed ? (
                          <span className="shrink-0 font-display text-[13px] font-bold text-brand-dark">
                            {Number(
                              attempt?.score ||
                                0
                            )}
                            /
                            {maximumMarks}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[11px] font-medium text-muted">
                            Not attempted
                          </span>
                        )}

                      </li>
                    );
                  }
                )}

              </ul>

              <Link
                href="/daily"
                className="mt-5 flex w-full items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-foreground/90"
              >
                Complete Today&apos;s Target
              </Link>

            </div>
          </div>

        </div>
      </section>

      {/* ================================================= */}
      {/* LIVE LEADERBOARDS */}
      {/* ================================================= */}

      {user && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand-dark">
                Live Rankings
              </p>

              <h2 className="mt-1 font-display text-[26px] font-bold text-foreground">
                Today&apos;s Top Performers
              </h2>

              <p className="mt-1.5 text-sm text-muted">
                Rankings update automatically after every submission.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
              Live
            </div>

          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">

            <LeaderboardCard
              title="Quantitative Aptitude"
              state={
                leaderboards.quant
              }
              currentUserId={
                user.uid
              }
            />

            <LeaderboardCard
              title="VARC"
              state={
                leaderboards.varc
              }
              currentUserId={
                user.uid
              }
            />

            <LeaderboardCard
              title="DILR"
              state={
                leaderboards.dilr
              }
              currentUserId={
                user.uid
              }
            />

          </div>
        </section>
      )}

      {/* ================================================= */}
      {/* FEATURE GRID */}
      {/* ================================================= */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

        <h2 className="font-display text-[26px] font-bold text-foreground">
          Everything you need, in one place
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {features.map(
            (feature) => (
              <Link
                key={feature.href}
                href={feature.href}
                className="group rounded-2xl border border-border bg-white p-5 transition hover:border-brand hover:shadow-lg hover:shadow-brand/[0.06]"
              >

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-darker">
                  <feature.icon size={19} />
                </div>

                <p className="mt-4 font-display text-[15.5px] font-semibold text-foreground">
                  {feature.title}
                </p>

                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {feature.desc}
                </p>

                <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-dark opacity-0 transition group-hover:opacity-100">
                  Explore{" "}
                  <ArrowRight size={13} />
                </span>

              </Link>
            )
          )}

        </div>
      </section>

      {/* ================================================= */}
      {/* HOW IT WORKS */}
      {/* ================================================= */}

      <section className="border-y border-border bg-surface-muted">

        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

          <h2 className="font-display text-[26px] font-bold text-foreground">
            How it works
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">

            {steps.map(
              (step) => (
                <div
                  key={step.n}
                  className="rounded-2xl bg-white p-5"
                >

                  <div className="flex items-center justify-between">

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                      <step.icon size={18} />
                    </div>

                    <span className="font-display text-[13px] font-semibold text-border">
                      {step.n}
                    </span>

                  </div>

                  <p className="mt-4 font-display text-[15.5px] font-semibold text-foreground">
                    {step.title}
                  </p>

                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                    {step.desc}
                  </p>

                </div>
              )
            )}

          </div>
        </div>
      </section>

      {/* ================================================= */}
      {/* CTA */}
      {/* ================================================= */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-foreground px-6 py-10 sm:flex-row sm:items-center sm:px-10">

          <div>

            <p className="font-display text-[22px] font-bold text-white">
              Ready to start your streak?
            </p>

            <p className="mt-1.5 max-w-md text-[14px] text-white/70">
              Sign in with Google and attempt today&apos;s daily practice.
            </p>

          </div>

          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-brand-dark"
          >
            Continue with Google{" "}
            <ArrowRight size={16} />
          </Link>

        </div>

      </section>

    </div>
  );
}
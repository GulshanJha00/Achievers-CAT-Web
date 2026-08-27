"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  Loader2,
  Users,
} from "lucide-react";

import {
  collection,
  doc,
  onSnapshot,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

const features = [
  {
    href: "/daily",
    icon: Target,
    title: "Daily Practice",
    desc: "Quantitative Aptitude, RC / VA, and DILR daily practice with live scores.",
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

type Section = "quant" | "varc" | "dilr";

type Attempt = {
  score: number;
  correct: number;
  wrong: number;
  total: number;
};

type LeaderboardEntry = {
  userId: string;
  displayName?: string;
  email?: string;
  score: number;
  correct: number;
  wrong: number;
  total: number;
};

type LeaderboardState = {
  entries: LeaderboardEntry[];
  total: number;
};

const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());

const sectionInfo: Record<
  Section,
  {
    title: string;
    shortTitle: string;
  }
> = {
  quant: {
    title: "Quantitative Aptitude",
    shortTitle: "Quant",
  },
  varc: {
    title: "VARC",
    shortTitle: "VARC",
  },
  dilr: {
    title: "DILR",
    shortTitle: "DILR",
  },
};

function getDisplayName(entry: LeaderboardEntry) {
  if (entry.displayName?.trim()) {
    return entry.displayName.trim();
  }

  if (entry.email?.trim()) {
    return entry.email.split("@")[0];
  }

  return "Student";
}

function formatScore(score: number) {
  return score > 0 ? `+${score}` : `${score}`;
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  const [attempts, setAttempts] = useState<
    Record<Section, Attempt | null>
  >({
    quant: null,
    varc: null,
    dilr: null,
  });

  const [leaderboards, setLeaderboards] = useState<
    Record<Section, LeaderboardState>
  >({
    quant: { entries: [], total: 0 },
    varc: { entries: [], total: 0 },
    dilr: { entries: [], total: 0 },
  });

  const [leaderboardLoading, setLeaderboardLoading] = useState(true);

  const date = useMemo(() => todayIST(), []);

  /*
   * --------------------------------------------------
   * AUTH
   * --------------------------------------------------
   */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /*
   * --------------------------------------------------
   * LIVE USER STREAK
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!user) {
      setStreak(0);
      return;
    }

    const streakRef = doc(db, "user_streaks", user.uid);

    return onSnapshot(
      streakRef,
      (snap) => {
        if (!snap.exists()) {
          setStreak(0);
          return;
        }

        const currentStreak = Number(snap.data().currentStreak ?? 0);
        setStreak(
          Number.isFinite(currentStreak) && currentStreak >= 0
            ? currentStreak
            : 0
        );
      },
      (error) => {
        console.error("Could not listen to user streak:", error);
        setStreak(0);
      }
    );
  }, [user]);

  /*
   * --------------------------------------------------
   * LIVE DAILY ATTEMPTS FOR CURRENT USER
   * --------------------------------------------------
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

    const unsubscribers = (["quant", "varc", "dilr"] as Section[]).map(
      (section) => {
        const ref = doc(
          db,
          "daily_attempts",
          `${date}_${section}_${user.uid}`
        );

        return onSnapshot(
          ref,
          (snap) => {
            setAttempts((previous) => ({
              ...previous,
              [section]: snap.exists()
                ? {
                    score: Number(snap.data().score || 0),
                    correct: Number(snap.data().correct || 0),
                    wrong: Number(snap.data().wrong || 0),
                    total: Number(snap.data().total || 0),
                  }
                : null,
            }));
          },
          (error) => {
            console.error(
              `Could not listen to ${section} daily attempt:`,
              error
            );
          }
        );
      }
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [user, date]);

  /*
   * --------------------------------------------------
   * LIVE LEADERBOARDS
   *
   * IMPORTANT:
   *
   * The collection path is:
   *
   * daily_leaderboards
   *   └── 2026-08-27_quant
   *       └── entries
   *
   * NOT:
   *
   * daily_leaderboards/2026-08-27/quant/entries
   *
   * This fixes the Firestore "odd number of segments" error.
   * --------------------------------------------------
   */

  useEffect(() => {
    setLeaderboardLoading(true);

    const unsubscribers = (["quant", "varc", "dilr"] as Section[]).map(
      (section) => {
        const entriesRef = collection(
          db,
          "daily_leaderboards",
          `${date}_${section}`,
          "entries"
        );

        return onSnapshot(
          entriesRef,
          (snapshot) => {
            const allEntries: LeaderboardEntry[] = snapshot.docs.map(
              (entryDoc) => {
                const data = entryDoc.data();

                return {
                  userId: String(data.userId || entryDoc.id),
                  displayName: data.displayName || "",
                  email: data.email || "",
                  score: Number(data.score || 0),
                  correct: Number(data.correct || 0),
                  wrong: Number(data.wrong || 0),
                  total: Number(data.total || 0),
                };
              }
            );

            allEntries.sort((a, b) => {
              if (b.score !== a.score) {
                return b.score - a.score;
              }

              if (b.correct !== a.correct) {
                return b.correct - a.correct;
              }

              if (a.wrong !== b.wrong) {
                return a.wrong - b.wrong;
              }

              return getDisplayName(a).localeCompare(
                getDisplayName(b)
              );
            });

            setLeaderboards((previous) => ({
              ...previous,
              [section]: {
                entries: allEntries.slice(0, 10),
                total: allEntries.length,
              },
            }));

            setLeaderboardLoading(false);
          },
          (error) => {
            console.error(
              `Could not listen to ${section} leaderboard:`,
              error
            );

            setLeaderboardLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [date]);

  /*
   * --------------------------------------------------
   * TARGET
   * --------------------------------------------------
   */

  const completedCount = (["quant", "varc", "dilr"] as Section[]).filter(
    (section) => attempts[section] !== null
  ).length;

  const targetPercentage = Math.round((completedCount / 3) * 100);

  /*
   * --------------------------------------------------
   * LOADING
   * --------------------------------------------------
   */

  if (authLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden border-b border-brand/20 bg-brand-tint py-2">
        <div className="announcement-scroll w-max whitespace-nowrap px-4 text-sm font-semibold text-brand-darker">
          ACHIEVERS CAT is everything you need for CAT — join the WhatsApp group for more updates: {" "}
          <a href="https://chat.whatsapp.com/L59MZiqz4ueKOSEyZ06TxD" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            https://chat.whatsapp.com/L59MZiqz4ueKOSEyZ06TxD
          </a>
        </div>
      </div>
      {/* --------------------------------------------------
          HERO
      -------------------------------------------------- */}

      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-brand-tint px-3 py-1 text-[12.5px] font-medium text-brand-darker">
              <Flame size={13} className="text-flame" />
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
              Daily questions, sectional and full CAT-pattern mocks,
              and study material — with your streak, scores and
              scorecards tracked in one place.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/daily"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[14.5px] font-semibold text-white shadow-sm shadow-brand/30 transition hover:bg-brand-dark"
              >
                Start Practising
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

          {/* --------------------------------------------------
              TODAY'S TARGET
          -------------------------------------------------- */}

          <div className="relative">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-xl shadow-black/[0.04] sm:p-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-[15px] font-semibold text-foreground">
                  Today&apos;s Target
                </p>

                <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[12px] font-semibold text-brand-darker">
                  <Flame size={12} className="text-flame" />
                  {streak}-day streak
                </span>
              </div>

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
                        97.4 -
                        (97.4 * targetPercentage) / 100
                      }
                      strokeLinecap="round"
                    />
                  </svg>

                  <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-bold text-foreground">
                    {completedCount}/3
                  </span>
                </div>

                <p className="text-[13.5px] leading-snug text-muted">
                  {completedCount === 3
                    ? "You completed all three sections today. Great work!"
                    : "Complete today's target to keep your streak alive."}
                </p>
              </div>

              <ul className="mt-5 space-y-2.5 border-t border-border pt-4">
                {/* QUANT */}

                <li
                  className={`flex items-center justify-between gap-3 text-[14px] ${
                    attempts.quant
                      ? "text-foreground"
                      : "text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {attempts.quant ? (
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

                    <span>Question of the Day</span>
                  </div>

                  {attempts.quant && (
                    <span className="font-semibold text-brand-darker">
                      {attempts.quant.score}/
                      {attempts.quant.total * 3}
                    </span>
                  )}
                </li>

                {/* VARC */}

                <li
                  className={`flex items-center justify-between gap-3 text-[14px] ${
                    attempts.varc
                      ? "text-foreground"
                      : "text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {attempts.varc ? (
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

                    <span>RC / VA of the Day</span>
                  </div>

                  {attempts.varc && (
                    <span className="font-semibold text-brand-darker">
                      {attempts.varc.score}/
                      {attempts.varc.total * 3}
                    </span>
                  )}
                </li>

                {/* DILR */}

                <li
                  className={`flex items-center justify-between gap-3 text-[14px] ${
                    attempts.dilr
                      ? "text-foreground"
                      : "text-muted"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {attempts.dilr ? (
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

                    <span>DILR Set of the Day</span>
                  </div>

                  {attempts.dilr && (
                    <span className="font-semibold text-brand-darker">
                      {attempts.dilr.score}/
                      {attempts.dilr.total * 3}
                    </span>
                  )}
                </li>
              </ul>

              <Link
                href="/daily"
                className="mt-5 flex w-full items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-foreground/90"
              >
                {completedCount === 3
                  ? "View Today's Practice"
                  : "Complete Today's Target"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
          LIVE LEADERBOARDS
      -------------------------------------------------- */}

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
              Rankings update automatically after every completed
              section.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Users size={15} />
            Live leaderboard
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {(["quant", "varc", "dilr"] as Section[]).map(
            (section) => {
              const leaderboard = leaderboards[section];

              return (
                <div
                  key={section}
                  className="rounded-2xl border border-border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Trophy
                          size={18}
                          className="text-brand-dark"
                        />

                        <h3 className="font-display text-[16px] font-bold">
                          Top 10/{leaderboard.total}
                        </h3>
                      </div>

                      <p className="mt-1 text-xs text-muted">
                        {sectionInfo[section].title}
                      </p>
                    </div>

                    <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-bold text-brand-darker">
                      {leaderboard.total} attempted
                    </span>
                  </div>

                  {leaderboardLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <Loader2
                        size={20}
                        className="animate-spin text-brand"
                      />
                    </div>
                  ) : leaderboard.entries.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm font-semibold text-foreground">
                        No attempts yet
                      </p>

                      <p className="mt-1 text-xs text-muted">
                        Be the first to attempt this section.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-2">
                      {leaderboard.entries.map(
                        (entry, index) => (
                          <div
                            key={entry.userId}
                            className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                          >
                            <div
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                index === 0
                                  ? "bg-brand text-white"
                                  : "bg-surface-muted text-muted"
                              }`}
                            >
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-semibold text-foreground">
                                {getDisplayName(entry)}
                              </p>

                              <p className="text-[11px] text-muted">
                                {entry.correct} correct ·{" "}
                                {entry.wrong} wrong
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-display text-sm font-bold text-brand-darker">
                                {formatScore(entry.score)}
                              </p>

                              <p className="text-[10px] text-muted">
                                marks
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* --------------------------------------------------
          FEATURE GRID
      -------------------------------------------------- */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h2 className="font-display text-[26px] font-bold text-foreground">
          Everything you need, in one place
        </h2>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group rounded-2xl border border-border bg-white p-5 transition hover:border-brand hover:shadow-lg hover:shadow-brand/[0.06]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-tint text-brand-darker">
                <f.icon size={19} />
              </div>

              <p className="mt-4 font-display text-[15.5px] font-semibold text-foreground">
                {f.title}
              </p>

              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                {f.desc}
              </p>

              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-dark opacity-0 transition group-hover:opacity-100">
                Explore
                <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------
          HOW IT WORKS
      -------------------------------------------------- */}

      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-[26px] font-bold text-foreground">
            How it works
          </h2>

          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl bg-white p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white">
                    <s.icon size={18} />
                  </div>

                  <span className="font-display text-[13px] font-semibold text-border">
                    {s.n}
                  </span>
                </div>

                <p className="mt-4 font-display text-[15.5px] font-semibold text-foreground">
                  {s.title}
                </p>

                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------
          CTA
      -------------------------------------------------- */}

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-foreground px-6 py-10 sm:flex-row sm:items-center sm:px-10">
          <div>
            <p className="font-display text-[22px] font-bold text-white">
              Ready to start your streak?
            </p>

            <p className="mt-1.5 max-w-md text-[14px] text-white/70">
              Sign in with Google and attempt today&apos;s daily
              practice.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-brand-dark"
          >
            Continue with Google
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

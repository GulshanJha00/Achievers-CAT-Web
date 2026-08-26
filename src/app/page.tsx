import Link from "next/link";
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
} from "lucide-react";

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

export default function Home() {
  return (
    <div>
      {/* Hero */}
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
              Practice <span className="text-brand-dark">consistently</span>.
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
                Start Practising <ArrowRight size={16} />
              </Link>
              <Link
                href="/mocks"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-3 text-[14.5px] font-semibold text-foreground transition hover:border-brand hover:text-brand-darker"
              >
                Attempt a Mock
              </Link>
            </div>
          </div>

          {/* Signature element: today's target panel */}
          <div className="relative">
            <div className="rounded-2xl border border-border bg-white p-5 shadow-xl shadow-black/[0.04] sm:p-6">
              <div className="flex items-center justify-between">
                <p className="font-display text-[15px] font-semibold text-foreground">
                  Today&apos;s Target
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[12px] font-semibold text-brand-darker">
                  <Flame size={12} className="text-flame" /> 7-day streak
                </span>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-16 w-16 shrink-0">
                  <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e6ebe8" strokeWidth="3.5" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="3.5"
                      strokeDasharray="97.4"
                      strokeDashoffset="32.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center font-display text-[13px] font-bold text-foreground">
                    2/3
                  </span>
                </div>
                <p className="text-[13.5px] leading-snug text-muted">
                  Complete today&apos;s target to keep your streak alive.
                </p>
              </div>

              <ul className="mt-5 space-y-2.5 border-t border-border pt-4">
                <li className="flex items-center gap-2.5 text-[14px] text-foreground">
                  <CheckCircle2 size={17} className="shrink-0 text-brand" />
                  Question of the Day
                </li>
                <li className="flex items-center gap-2.5 text-[14px] text-foreground">
                  <CheckCircle2 size={17} className="shrink-0 text-brand" />
                  RC of the Day
                </li>
                <li className="flex items-center gap-2.5 text-[14px] text-muted">
                  <Circle size={17} className="shrink-0 text-border" />
                  DILR Set of the Day
                </li>
              </ul>

              <Link
                href="/daily/targets"
                className="mt-5 flex w-full items-center justify-center rounded-full bg-foreground px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-foreground/90"
              >
                Complete Today&apos;s Target
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
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
                Explore <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface-muted">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-[26px] font-bold text-foreground">
            How it works
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white p-5">
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

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-foreground px-6 py-10 sm:flex-row sm:items-center sm:px-10">
          <div>
            <p className="font-display text-[22px] font-bold text-white">
              Ready to start your streak?
            </p>
            <p className="mt-1.5 max-w-md text-[14px] text-white/70">
              Sign in with Google and attempt today&apos;s Question of the Day
              in under two minutes.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand px-5 py-3 text-[14.5px] font-semibold text-white transition hover:bg-brand-dark"
          >
            Continue with Google <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, Flame } from "lucide-react";

const tasks = [
  { href: "/daily/question", label: "Question of the Day", desc: "One CAT-level question, refreshed daily.", done: true },
  { href: "/daily/rc", label: "RC of the Day", desc: "A short passage with 5 questions.", done: true },
  { href: "/daily/targets", label: "DILR Set of the Day", desc: "One DILR set to keep every section warm.", done: false },
];

export default function DailyPracticePage() {
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[28px] font-bold text-foreground">
          Daily Practice
        </h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-[13px] font-semibold text-brand-darker">
          <Flame size={14} className="text-flame" /> 7-day streak
        </span>
      </div>
      <p className="mt-2 text-[14.5px] text-muted">
        {done}/{tasks.length} completed today — finish all three to keep your
        streak alive.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {tasks.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 transition hover:border-brand hover:shadow-md hover:shadow-brand/[0.06]"
          >
            <div className="flex items-center gap-3">
              {t.done ? (
                <CheckCircle2 size={20} className="shrink-0 text-brand" />
              ) : (
                <Circle size={20} className="shrink-0 text-border" />
              )}
              <div>
                <p className="text-[14.5px] font-semibold text-foreground">
                  {t.label}
                </p>
                <p className="text-[13px] text-muted">{t.desc}</p>
              </div>
            </div>
            <ArrowRight size={16} className="shrink-0 text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}

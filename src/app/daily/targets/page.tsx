import { CheckCircle2, Circle, Flame } from "lucide-react";

const tasks = [
  { label: "Question of the Day", done: true },
  { label: "RC of the Day", done: true },
  { label: "DILR Set of the Day", done: false },
];

export default function DailyTargetsPage() {
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[24px] font-bold text-foreground">
        Today&apos;s Targets
      </h1>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-[15px] font-semibold text-foreground">
            {done}/{tasks.length} Completed
          </p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-1 text-[12px] font-semibold text-brand-darker">
            <Flame size={13} className="text-flame" /> 7-day streak
          </span>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${(done / tasks.length) * 100}%` }}
          />
        </div>

        <ul className="mt-5 space-y-3">
          {tasks.map((t) => (
            <li key={t.label} className="flex items-center gap-2.5 text-[14px]">
              {t.done ? (
                <CheckCircle2 size={18} className="shrink-0 text-brand" />
              ) : (
                <Circle size={18} className="shrink-0 text-border" />
              )}
              <span className={t.done ? "text-foreground" : "text-muted"}>
                {t.label}
              </span>
            </li>
          ))}
        </ul>

        <button className="mt-6 w-full rounded-full bg-foreground px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-foreground/90">
          Complete Today&apos;s Target
        </button>
      </div>

      <p className="mt-4 text-center text-[12.5px] text-muted">
        Your streak resets if a day&apos;s targets aren&apos;t completed by midnight.
      </p>
    </div>
  );
}

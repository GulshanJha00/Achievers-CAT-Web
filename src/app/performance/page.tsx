const summary = [
  { label: "Mocks Attempted", value: "18" },
  { label: "Average Score", value: "124" },
  { label: "Best Score", value: "167" },
  { label: "Average Accuracy", value: "76%" },
];

const sectionWise = [
  { section: "VARC", pct: 78 },
  { section: "DILR", pct: 64 },
  { section: "QA", pct: 83 },
];

const weakAreas = ["Time & Work", "Modern Mathematics", "LR Arrangements"];

export default function PerformancePage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold text-foreground">
        My Performance
      </h1>
      <p className="mt-2 text-[14.5px] text-muted">
        A summary across every mock and daily practice attempt.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summary.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-white p-4 text-center">
            <p className="font-display text-[22px] font-bold text-foreground">{s.value}</p>
            <p className="mt-0.5 text-[12px] text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-white p-5">
        <p className="font-display text-[15px] font-semibold text-foreground">
          Section-wise Performance
        </p>
        <div className="mt-4 flex flex-col gap-4">
          {sectionWise.map((s) => (
            <div key={s.section}>
              <div className="flex justify-between text-[13px]">
                <span className="font-medium text-foreground">{s.section}</span>
                <span className="text-muted">{s.pct}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <p className="font-display text-[15px] font-semibold text-foreground">
          Weak Areas
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {weakAreas.map((w) => (
            <span
              key={w}
              className="rounded-full bg-red-50 px-3 py-1.5 text-[13px] font-medium text-red-600"
            >
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

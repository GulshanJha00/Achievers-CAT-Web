"use client";

import { useParams } from "next/navigation";
import { Download, TrendingUp } from "lucide-react";

// Placeholder — replace with a Firebase query against `results` for this
// attempt. Scores are computed server-side at submission time so the
// scoring rules never live in client code the student can inspect.
const sectionScores = [
  { section: "VARC", score: 48, accuracy: 82 },
  { section: "DILR", score: 54, accuracy: 86 },
  { section: "QA", score: 61, accuracy: 78 },
];

export default function MockResultPage() {
  const params = useParams();
  const mockId = params.mockId as string;
  const overall = sectionScores.reduce((s, x) => s + x.score, 0);
  const avgAccuracy = Math.round(
    sectionScores.reduce((s, x) => s + x.accuracy, 0) / sectionScores.length
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-brand-dark">
        Mock Test Scorecard
      </p>
      <h1 className="mt-1 font-display text-[26px] font-bold text-foreground">
        ACHIEVERS CAT — Mock #{mockId}
      </h1>
      <p className="mt-1 text-[13.5px] text-muted">Attempted on 26 August 2026</p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Raw Score" value={String(overall)} />
        <Stat label="Accuracy" value={`${avgAccuracy}%`} />
        <Stat label="Percentile" value="93.41" />
        <Stat label="Rank" value="#214" />
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-[14px]">
          <thead className="bg-surface-muted text-[12.5px] uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">Section</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Accuracy</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sectionScores.map((s) => (
              <tr key={s.section}>
                <td className="px-4 py-3 font-medium text-foreground">{s.section}</td>
                <td className="px-4 py-3 text-muted">{s.score}</td>
                <td className="px-4 py-3 text-muted">{s.accuracy}%</td>
              </tr>
            ))}
            <tr className="bg-brand-tint/40 font-semibold text-foreground">
              <td className="px-4 py-3">Overall</td>
              <td className="px-4 py-3">{overall}</td>
              <td className="px-4 py-3">{avgAccuracy}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 text-[14px] font-semibold text-white hover:bg-brand-dark">
          <Download size={16} /> Download Scorecard PDF
        </button>
        <button className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-[14px] font-semibold text-foreground hover:border-brand hover:text-brand-darker">
          <TrendingUp size={16} /> View Topic-wise Analysis
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 text-center">
      <p className="font-display text-[22px] font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[12px] text-muted">{label}</p>
    </div>
  );
}

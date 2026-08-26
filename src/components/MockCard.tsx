import Link from "next/link";
import { Clock, ListOrdered, ArrowUpRight } from "lucide-react";

export type MockSummary = {
  id: string;
  name: string;
  questions: number;
  durationMins: number;
  difficulty: "Easy" | "Moderate" | "Hard" | "CAT Level";
  type?: "full" | "sectional";
  section?: string;
  attempted?: {
    score: number;
    percentile?: number;
    attemptedOn: string;
  };
};

const difficultyStyle: Record<MockSummary["difficulty"], string> = {
  Easy: "bg-brand-tint text-brand-darker",
  Moderate: "bg-amber-50 text-amber-700",
  Hard: "bg-red-50 text-red-600",
  "CAT Level": "bg-slate-100 text-slate-700",
};

export default function MockCard({ mock }: { mock: MockSummary }) {
  const href = `/mock-view/${mock.id}`;

  return (
    <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-white p-4 transition hover:border-brand hover:shadow-md hover:shadow-brand/[0.06] sm:flex-row sm:items-center sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-display text-[15px] font-semibold text-foreground hover:text-brand-darker hover:underline"
          >
            {mock.name}
          </Link>
          <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${difficultyStyle[mock.difficulty]}`}>
            {mock.difficulty}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5"><ListOrdered size={13} /> {mock.questions} questions</span>
          <span className="inline-flex items-center gap-1.5"><Clock size={13} /> {mock.durationMins} min</span>
          {mock.section && <span>{mock.section}</span>}
        </div>
        {mock.attempted && (
          <p className="mt-2 text-[12.5px] text-muted">
            Attempted {mock.attempted.attemptedOn} · Score {mock.attempted.score}
            {mock.attempted.percentile ? ` · ${mock.attempted.percentile} %ile` : ""}
          </p>
        )}
      </div>

      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-dark"
      >
        Open Mock <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

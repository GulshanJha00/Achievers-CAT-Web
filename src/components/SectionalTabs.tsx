"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import MockCard, { MockSummary } from "./MockCard";

const sections = ["VARC", "DILR", "QA"] as const;
type Section = (typeof sections)[number];

// Placeholder data — replace with a Firebase query against `mocks`
// filtered by section = 'VARC' | 'DILR' | 'QA' and type = 'sectional'.
const data: Record<Section, MockSummary[]> = {
  VARC: [
    { id: "varc-01", name: "VARC Sectional #01", questions: 24, durationMins: 40, difficulty: "Moderate" },
    { id: "varc-02", name: "VARC Sectional #02", questions: 24, durationMins: 40, difficulty: "Hard" },
    {
      id: "varc-03",
      name: "VARC Sectional #03",
      questions: 24,
      durationMins: 40,
      difficulty: "Moderate",
      attempted: { score: 48, attemptedOn: "22 Aug 2026" },
    },
  ],
  DILR: [
    { id: "dilr-01", name: "DILR Sectional #01", questions: 20, durationMins: 40, difficulty: "Hard" },
    { id: "dilr-02", name: "DILR Sectional #02", questions: 20, durationMins: 40, difficulty: "Moderate" },
  ],
  QA: [
    { id: "qa-01", name: "QA Sectional #01", questions: 22, durationMins: 40, difficulty: "Moderate" },
    { id: "qa-02", name: "QA Sectional #02", questions: 22, durationMins: 40, difficulty: "Easy" },
  ],
};

export default function SectionalTabs() {
  const params = useSearchParams();
  const initial = (params.get("section")?.toUpperCase() as Section) || "VARC";
  const [active, setActive] = useState<Section>(
    sections.includes(initial) ? initial : "VARC"
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold text-foreground">
        Sectional Mocks
      </h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Focused practice for one section at a time — VARC, DILR, or QA.
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto rounded-full border border-border bg-surface-muted p-1">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => setActive(s)}
            className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${
              active === s
                ? "bg-white text-brand-darker shadow-sm"
                : "text-muted hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {data[active].map((mock) => (
          <MockCard key={mock.id} mock={mock} />
        ))}
      </div>
    </div>
  );
}

import MockCard, { MockSummary } from "@/components/MockCard";

// Placeholder data — replace with a Firebase query against `mocks`
// where type = 'full', ordered by created_at. Mocks the student has
// already attempted (join on `attempts`) carry the `attempted` field,
// so completed mocks and upcoming ones live in the same list — no
// separate "previous mocks" section needed.
const fullMocks: MockSummary[] = [
  {
    id: "full-04",
    name: "ACHIEVERS CAT Full Mock #04",
    questions: 66,
    durationMins: 120,
    difficulty: "CAT Level",
    attempted: { score: 163, percentile: 93.41, attemptedOn: "24 Aug 2026" },
  },
  {
    id: "full-03",
    name: "ACHIEVERS CAT Full Mock #03",
    questions: 66,
    durationMins: 120,
    difficulty: "CAT Level",
    attempted: { score: 148, percentile: 88.02, attemptedOn: "17 Aug 2026" },
  },
  {
    id: "full-05",
    name: "ACHIEVERS CAT Full Mock #05",
    questions: 66,
    durationMins: 120,
    difficulty: "CAT Level",
  },
  {
    id: "full-06",
    name: "ACHIEVERS CAT Full Mock #06",
    questions: 66,
    durationMins: 120,
    difficulty: "CAT Level",
  },
];

export default function FullMocksPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold text-foreground">
        Full Mocks
      </h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Complete CAT-pattern mocks — VARC, DILR and QA together, on a
        120-minute timer. Attempted mocks show your score right here.
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {fullMocks.map((mock) => (
          <MockCard key={mock.id} mock={mock} />
        ))}
      </div>
    </div>
  );
}

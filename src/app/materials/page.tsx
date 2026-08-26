import { FileText, Download } from "lucide-react";

// Placeholder — replace with a Firebase Storage listing joined against
// the `materials` table, filtered to published items.
const groups = [
  {
    section: "VARC",
    items: [
      { name: "RC Strategy Notes", size: "1.8 MB" },
      { name: "Para Summary Notes", size: "1.1 MB" },
      { name: "Grammar Notes", size: "2.4 MB" },
    ],
  },
  {
    section: "DILR",
    items: [
      { name: "Arrangements", size: "2.0 MB" },
      { name: "Games & Tournaments", size: "1.6 MB" },
      { name: "Venn Diagrams", size: "0.9 MB" },
    ],
  },
  {
    section: "QA",
    items: [
      { name: "Arithmetic Notes", size: "2.4 MB" },
      { name: "Algebra Notes", size: "1.9 MB" },
      { name: "Geometry Notes", size: "2.2 MB" },
    ],
  },
];

export default function MaterialsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold text-foreground">
        Materials
      </h1>
      <p className="mt-2 text-[14.5px] text-muted">
        Notes and PDFs by section — download anything you need for revision.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {groups.map((g) => (
          <div key={g.section}>
            <h2 className="font-display text-[16px] font-semibold text-foreground">
              {g.section}
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-darker">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-medium text-foreground">
                        {m.name}
                      </p>
                      <p className="text-[12px] text-muted">PDF · {m.size}</p>
                    </div>
                  </div>
                  <button
                    aria-label={`Download ${m.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

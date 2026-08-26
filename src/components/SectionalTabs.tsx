"use client";

import { useEffect, useState } from "react";
import MockCard, { MockSummary } from "./MockCard";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";

const sections = ["VARC", "DILR", "QA"] as const;
type Section = (typeof sections)[number];

export default function SectionalTabs() {
  const [active, setActive] = useState<Section>("VARC");
  const [data, setData] = useState<Record<Section, MockSummary[]>>({ VARC: [], DILR: [], QA: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "mocks"), where("type", "==", "sectional"), where("status", "==", "published")))
      .then((snap) => {
        const next: Record<Section, MockSummary[]> = { VARC: [], DILR: [], QA: [] };
        snap.docs.forEach((d) => {
          const row = { id: d.id, ...d.data() } as MockSummary;
          if (row.section && sections.includes(row.section as Section)) next[row.section as Section].push(row);
        });
        (Object.keys(next) as Section[]).forEach((key) => next[key].sort((a, b) => a.name.localeCompare(b.name)));
        setData(next);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold text-foreground">Sectional Mocks</h1>
      <p className="mt-2 text-[14.5px] text-muted">Focused practice for VARC, DILR and QA. Every uploaded HTML mock opens in a new tab.</p>

      <div className="mt-6 flex gap-2 overflow-x-auto rounded-full border border-border bg-surface-muted p-1">
        {sections.map((s) => (
          <button key={s} onClick={() => setActive(s)} className={`flex-1 whitespace-nowrap rounded-full px-4 py-2 text-[13.5px] font-semibold transition ${active === s ? "bg-white text-brand-darker shadow-sm" : "text-muted hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand" /></div> : data[active].length ? data[active].map((mock) => <MockCard key={mock.id} mock={mock} />) : <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">No {active} sectional mocks have been published yet.</div>}
      </div>
    </div>
  );
}

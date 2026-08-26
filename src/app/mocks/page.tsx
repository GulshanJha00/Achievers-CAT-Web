"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import MockCard, { MockSummary } from "@/components/MockCard";
import { db } from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";

export default function FullMocksPage() {
  const [mocks, setMocks] = useState<MockSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "mocks"), where("type", "==", "full"), where("status", "==", "published")))
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MockSummary));
        rows.sort((a, b) => a.name.localeCompare(b.name));
        setMocks(rows);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold text-foreground">Full Mocks</h1>
      <p className="mt-2 text-[14.5px] text-muted">Click any mock name or Open Mock — it opens the uploaded HTML mock in a new tab.</p>
      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand" /></div>
        ) : mocks.length ? mocks.map((mock) => <MockCard key={mock.id} mock={mock} />) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted">No full mocks have been published yet.</div>
        )}
      </div>
    </div>
  );
}

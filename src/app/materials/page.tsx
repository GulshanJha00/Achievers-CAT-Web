"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Download, FileText, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase/client";

type Material = { id: string; section: string; topic: string; name: string; size: number; url: string };
const sections = ["VARC", "DILR", "QA"];
const formatSize = (bytes: number) => bytes < 1_000_000 ? `${Math.max(1, Math.round(bytes / 1000))} KB` : `${(bytes / 1_000_000).toFixed(1)} MB`;

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "materials"), where("published", "==", true)))
      .then((snap) => setMaterials(snap.docs.map((item) => ({ id: item.id, ...item.data() }) as Material)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8"><h1 className="font-display text-[28px] font-bold text-foreground">Materials</h1><p className="mt-2 text-[14.5px] text-muted">Notes and PDFs grouped by section and topic.</p>{loading ? <div className="flex justify-center py-16"><Loader2 className="animate-spin text-brand" /></div> : <div className="mt-8 flex flex-col gap-10">{sections.map((section) => { const items = materials.filter((item) => item.section === section); return <div key={section}><h2 className="font-display text-[16px] font-semibold text-foreground">{section}</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.length === 0 ? <p className="text-sm text-muted">No materials uploaded yet.</p> : items.map((material) => <div key={material.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-darker"><FileText size={18} /></div><div className="min-w-0"><p className="truncate text-[14px] font-medium text-foreground">{material.name}</p><p className="text-[12px] text-muted">{material.topic} · {formatSize(material.size)}</p></div></div><a href={material.url} target="_blank" rel="noreferrer" aria-label={`Download ${material.name}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white hover:bg-brand-dark"><Download size={16} /></a></div>)}</div></div>; })}</div>}</div>;
}

"use client";

import { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Loader2, Upload } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";

const sections = ["VARC", "DILR", "QA"] as const;

export default function AdminMaterialsPage() {
  const [section, setSection] = useState<(typeof sections)[number]>("VARC");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadMaterial(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !topic.trim()) return;
    if (file.type !== "application/pdf") { setMessage("Please select a PDF file."); return; }
    setSaving(true); setMessage(null);
    try {
      const url = await uploadToCloudinary(file, "raw");
      await addDoc(collection(db, "materials"), { section, topic: topic.trim(), name: file.name, url, contentType: file.type, size: file.size, published: true, createdAt: serverTimestamp() });
      setTopic(""); setFile(null); if (inputRef.current) inputRef.current.value = "";
      setMessage("Material uploaded and published.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not upload the material."); }
    finally { setSaving(false); }
  }

  return <AdminGuard><div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8"><p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Admin</p><h1 className="mt-1 font-display text-[28px] font-bold">Upload Material</h1><p className="mt-2 text-sm text-muted">Choose a section, add the topic, then upload a PDF.</p><form onSubmit={uploadMaterial} className="mt-8 space-y-5 rounded-2xl border border-border bg-white p-6"><label className="block text-sm font-semibold">Section<select value={section} onChange={(event) => setSection(event.target.value as (typeof sections)[number])} className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal outline-none focus:border-brand">{sections.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Arithmetic, Reading Comprehension" required className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-brand" /></label><label className="block text-sm font-semibold">PDF file<input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required className="mt-2 block w-full text-sm font-normal text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:py-2 file:font-semibold file:text-brand-darker" /></label><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload PDF</button>{message && <p className="text-sm text-muted">{message}</p>}</form></div></AdminGuard>;
}

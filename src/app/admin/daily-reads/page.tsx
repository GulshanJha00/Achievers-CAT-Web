"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { ExternalLink, FileText, Link2, Loader2, Pencil, Trash2, Upload, X } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";

type DailyRead = { id: string; title: string; url: string; kind: "pdf" | "link"; published?: boolean };

function DailyReadsManager() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reads, setReads] = useState<DailyRead[]>([]);
  const [editing, setEditing] = useState<DailyRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadReads() {
    const snapshot = await getDocs(query(collection(db, "daily_reads"), orderBy("createdAt", "desc")));
    setReads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DailyRead));
  }

  useEffect(() => {
    let active = true;
    getDocs(query(collection(db, "daily_reads"), orderBy("createdAt", "desc")))
      .then((snapshot) => {
        if (active) setReads(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as DailyRead));
      })
      .catch(console.error)
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  function resetForm() {
    setTitle(""); setUrl(""); setFile(null); setEditing(null); setMessage("");
    if (fileInput.current) fileInput.current.value = "";
  }

  function startEditing(read: DailyRead) {
    setEditing(read); setTitle(read.title); setUrl(read.url); setFile(null); setMessage("");
    if (fileInput.current) fileInput.current.value = "";
  }

  async function saveRead(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || (!url.trim() && !file)) return;
    if (file && file.type !== "application/pdf") { setMessage("Please select a PDF file."); return; }
    if (url.trim()) {
      try { new URL(url.trim()); } catch { setMessage("Enter a valid article link, including https://."); return; }
    }
    setSaving(true); setMessage("");
    try {
      const readUrl = file ? await uploadToCloudinary(file, "raw") : url.trim();
      const fields = { title: title.trim(), url: readUrl, kind: file ? "pdf" : "link", published: true, updatedAt: serverTimestamp() };
      if (editing) {
        await updateDoc(doc(db, "daily_reads", editing.id), fields);
        setMessage("Daily read updated.");
      } else {
        await addDoc(collection(db, "daily_reads"), { ...fields, createdAt: serverTimestamp() });
        setMessage("Daily read published.");
      }
      resetForm();
      await loadReads();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the daily read."); }
    finally { setSaving(false); }
  }

  async function removeRead(read: DailyRead) {
    if (!window.confirm(`Delete “${read.title}”?`)) return;
    await deleteDoc(doc(db, "daily_reads", read.id));
    await loadReads();
  }

  return <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
    <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Admin</p>
    <h1 className="mt-1 font-display text-[28px] font-bold">Daily Reads</h1>
    <p className="mt-2 text-sm text-muted">Publish a newspaper PDF or an essay/article link for signed-in students.</p>
    <form onSubmit={saveRead} className="mt-8 space-y-5 rounded-2xl border border-border bg-white p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{editing ? "Edit daily read" : "Add daily read"}</h2>{editing && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"><X size={16} /> Cancel</button>}</div>
      <label className="block text-sm font-semibold">Clickable title<input value={title} onChange={(event) => setTitle(event.target.value)} required placeholder="e.g. The Hindu Editorial — August 28" className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-brand" /></label>
      <label className="block text-sm font-semibold">Essay or article link<input value={url} onChange={(event) => setUrl(event.target.value)} disabled={Boolean(file)} placeholder="https://example.com/article" className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-brand disabled:bg-surface-muted" /></label>
      <div className="flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-xs font-semibold text-muted">OR</span><div className="h-px flex-1 bg-border" /></div>
      <label className="block text-sm font-semibold">Newspaper PDF<input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setUrl(""); }} className="mt-2 block w-full text-sm font-normal text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:py-2 file:font-semibold file:text-brand-darker" /></label>
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{editing ? "Save changes" : "Publish daily read"}</button>
      {message && <p className="text-sm text-muted">{message}</p>}
    </form>
    <section className="mt-8 rounded-2xl border border-border bg-white p-6"><h2 className="font-display text-lg font-semibold">Published reads</h2>{loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" /></div> : reads.length === 0 ? <p className="mt-4 text-sm text-muted">No daily reads published yet.</p> : <div className="mt-4 divide-y divide-border">{reads.map((read) => <div key={read.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-brand-tint p-2 text-brand-darker">{read.kind === "pdf" ? <FileText size={17} /> : <Link2 size={17} />}</span><div className="min-w-0"><p className="truncate font-medium text-foreground">{read.title}</p><a href={read.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-darker">Open <ExternalLink size={12} /></a></div></div><div className="flex gap-2"><button onClick={() => startEditing(read)} className="rounded-full border border-border p-2 hover:border-brand" aria-label="Edit"><Pencil size={15} /></button><button onClick={() => removeRead(read)} className="rounded-full border border-border p-2 text-danger hover:border-danger" aria-label="Delete"><Trash2 size={15} /></button></div></div>)}</div>}</section>
  </div>;
}

export default function AdminDailyReadsPage() { return <AdminGuard><DailyReadsManager /></AdminGuard>; }

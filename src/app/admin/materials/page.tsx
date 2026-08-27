"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, doc, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { Loader2, Pencil, Upload, X } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase/client";
import { uploadToCloudinary } from "@/lib/cloudinary";

const sections = ["VARC", "DILR", "QA"] as const;
type Section = (typeof sections)[number];
type Material = { id: string; name: string; topic: string; section: Section; size: number; url: string };

export default function AdminMaterialsPage() {
  const [section, setSection] = useState<Section | "">("");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<Material | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadMaterials() {
    const snapshot = await getDocs(collection(db, "materials"));
    setMaterials(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Material));
  }

  useEffect(() => {
    getDocs(collection(db, "materials"))
      .then((snapshot) => setMaterials(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Material)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function resetForm() {
    setEditing(null); setSection(""); setName(""); setTopic(""); setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function startEditing(material: Material) {
    setEditing(material); setSection(material.section); setName(material.name); setTopic(material.topic); setFile(null); setMessage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function saveMaterial(event: React.FormEvent) {
    event.preventDefault();
    if (!section || !name.trim() || !topic.trim() || (!editing && !file)) return;
    if (file && file.type !== "application/pdf") { setMessage("Please select a PDF file."); return; }
    setSaving(true); setMessage(null);
    try {
      const fields: Record<string, unknown> = { section, name: name.trim(), topic: topic.trim(), updatedAt: serverTimestamp() };
      if (file) {
        fields.url = await uploadToCloudinary(file, "raw");
        fields.contentType = file.type;
        fields.size = file.size;
      }
      if (editing) {
        await updateDoc(doc(db, "materials", editing.id), fields);
        setMessage("Material updated.");
      } else {
        await addDoc(collection(db, "materials"), { ...fields, published: true, createdAt: serverTimestamp() });
        setMessage("Material uploaded and published.");
      }
      resetForm();
      await loadMaterials();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the material."); }
    finally { setSaving(false); }
  }

  return <AdminGuard><div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8"><p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Admin</p><h1 className="mt-1 font-display text-[28px] font-bold">Materials</h1><p className="mt-2 text-sm text-muted">Upload a PDF or update an existing material.</p><form onSubmit={saveMaterial} className="mt-8 space-y-5 rounded-2xl border border-border bg-white p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold">{editing ? "Edit material" : "Upload material"}</h2>{editing && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-foreground"><X size={16} /> Cancel</button>}</div><label className="block text-sm font-semibold">Section<select value={section} onChange={(event) => setSection(event.target.value as Section)} required className="mt-2 w-full rounded-xl border border-border bg-white px-3 py-2.5 font-normal outline-none focus:border-brand"><option value="" disabled>Select a section</option>{sections.map((item) => <option key={item} value={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">Material name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Must-do RCs" required className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-brand" /></label><label className="block text-sm font-semibold">Topic<input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Reading Comprehension" required className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-brand" /></label><label className="block text-sm font-semibold">{editing ? "Replace PDF (optional)" : "PDF file"}<input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} required={!editing} className="mt-2 block w-full text-sm font-normal text-muted file:mr-4 file:rounded-full file:border-0 file:bg-brand-tint file:px-4 file:py-2 file:font-semibold file:text-brand-darker" /></label><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}{editing ? "Save changes" : "Upload PDF"}</button>{message && <p className="text-sm text-muted">{message}</p>}</form><section className="mt-8 rounded-2xl border border-border bg-white p-6"><h2 className="font-display text-lg font-semibold">Uploaded materials</h2>{loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand" /></div> : materials.length === 0 ? <p className="mt-4 text-sm text-muted">No materials uploaded yet.</p> : <div className="mt-4 divide-y divide-border">{materials.map((material) => <div key={material.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"><div><p className="font-medium text-foreground">{material.name}</p><p className="mt-1 text-xs text-muted">{material.section} · {material.topic}</p></div><button onClick={() => startEditing(material)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-semibold hover:border-brand"><Pencil size={14} /> Edit</button></div>)}</div>}</section></div></AdminGuard>;
}

"use client";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { Bell, Loader2, Send } from "lucide-react";
import AdminGuard from "@/components/AdminGuard";
import { db } from "@/lib/firebase/client";
import { showToast } from "@/components/Toast";

export default function AdminNotificationsPage() {
  const [text, setText] = useState(""); const [saving, setSaving] = useState(false);
  async function send() { if (!text.trim()) return; setSaving(true); try { await addDoc(collection(db, "notifications"), { text: text.trim(), createdAt: serverTimestamp() }); setText(""); showToast("Notification published"); } finally { setSaving(false); } }
  return <AdminGuard><div className="mx-auto max-w-2xl px-4 py-12 sm:px-6"><p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">Admin</p><h1 className="mt-1 flex items-center gap-2 font-display text-[28px] font-bold"><Bell className="text-brand" /> Notifications</h1><p className="mt-2 text-sm text-muted">Send a message visible to every signed-in student.</p><div className="mt-8 rounded-2xl border border-border bg-white p-6"><label className="block text-sm font-semibold">Notification text<textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={280} rows={5} placeholder="e.g. CAT Mock #12 is now live." className="mt-2 w-full resize-none rounded-xl border border-border p-3 font-normal outline-none focus:border-brand" /></label><div className="mt-2 text-right text-xs text-muted">{text.length}/280</div><button onClick={send} disabled={saving || !text.trim()} className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Publish notification</button></div></div></AdminGuard>;
}

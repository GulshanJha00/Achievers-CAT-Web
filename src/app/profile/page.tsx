"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Loader2, LogOut, Mail, Save, Upload, UserRound } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";
import { signOutUser } from "@/lib/firebase/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => onAuthStateChanged(auth, (next) => { setUser(next); setName(next?.displayName ?? ""); setPreview(next?.photoURL ?? ""); setLoading(false); }), []);

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true); setMessage(null);
    try {
      let photoURL = user.photoURL ?? "";
      if (photo) photoURL = await uploadToCloudinary(photo, "image");
      await updateProfile(user, { displayName: name.trim(), photoURL });
      await setDoc(doc(db, "profiles", user.uid), { name: name.trim(), displayName: name.trim(), avatarUrl: photoURL, photoURL, email: user.email ?? "", updatedAt: serverTimestamp() }, { merge: true });
      setUser({ ...user, displayName: name.trim(), photoURL });
      setPhoto(null); if (inputRef.current) inputRef.current.value = "";
      setMessage("Profile updated.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not update your profile."); }
    finally { setSaving(false); }
  }

  async function logout() { await signOutUser(); window.location.href = "/"; }

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted">Loading profile…</div>;
  if (!user) return <div className="mx-auto max-w-xl px-4 py-16 text-center"><h1 className="font-display text-2xl font-bold">Sign in to view your profile</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;

  return <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8"><h1 className="font-display text-[28px] font-bold">Profile</h1><p className="mt-2 text-[14px] text-muted">Update the name and photo shown across ACHIEVERS CAT.</p><form onSubmit={saveProfile} className="mt-8 rounded-2xl border border-border bg-white p-6"><div className="flex flex-wrap items-center gap-5">{preview ? <img src={preview} alt="Profile preview" className="h-20 w-20 rounded-full object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-tint text-brand-darker"><UserRound size={28} /></div>}<label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:border-brand"><Upload size={16} /> Change photo<input ref={inputRef} type="file" accept="image/*" onChange={(event) => { const next = event.target.files?.[0] ?? null; setPhoto(next); if (next) setPreview(URL.createObjectURL(next)); }} className="hidden" /></label></div><label className="mt-6 block text-sm font-semibold">Name<input value={name} onChange={(event) => setName(event.target.value)} required className="mt-2 w-full rounded-xl border border-border px-3 py-2.5 font-normal outline-none focus:border-brand" /></label><p className="mt-3 flex items-center gap-1.5 text-sm text-muted"><Mail size={14} /> {user.email}</p><button disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-full cursor-pointer bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save changes</button>{message && <p className="mt-3 text-sm text-muted">{message}</p>}<div className="mt-6 grid gap-3 border-t border-border pt-6 sm:grid-cols-2"><Link href="/performance" className="rounded-xl border border-border px-4 py-3 text-center text-sm font-semibold hover:border-brand">My Performance</Link><button type="button" onClick={logout} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-danger hover:bg-red-50"><LogOut size={16} /> Logout</button></div></form></div>;
}

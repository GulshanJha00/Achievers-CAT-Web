"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { signOutUser } from "@/lib/firebase/auth";
import { UserRound, Mail, LogOut } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted">Loading profile…</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to view your profile</h1>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link>
      </div>
    );
  }

  async function logout() {
    await signOutUser();
    window.location.href = "/";
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-display text-[28px] font-bold">Profile</h1>
      <p className="mt-2 text-[14px] text-muted">Your Google account details used by ACHIEVERS CAT.</p>
      <div className="mt-8 rounded-2xl border border-border bg-white p-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? <img src={user.photoURL} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-tint text-brand-darker"><UserRound /></div>}
          <div>
            <h2 className="font-display text-lg font-semibold">{user.displayName || "Student"}</h2>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Mail size={14} /> {user.email}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/performance" className="rounded-xl border border-border px-4 py-3 text-sm font-semibold hover:border-brand">My Performance</Link>
          <button onClick={logout} className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-danger hover:bg-red-50"><LogOut size={16} /> Logout</button>
        </div>
      </div>
    </div>
  );
}

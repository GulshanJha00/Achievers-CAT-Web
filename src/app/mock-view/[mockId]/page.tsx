"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function MockViewPage({ params }: { params: Promise<{ mockId: string }> }) {
  const [mockId, setMockId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "auth" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    params.then((p) => setMockId(p.mockId));
  }, [params]);

  useEffect(() => {
    if (!mockId) return;
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("auth");
        return;
      }
      try {
        const chunks = await getDocs(query(collection(db, "mock_file_chunks"), where("mockId", "==", mockId)));
        if (chunks.empty) throw new Error("This mock file is not available.");
        const parts = chunks.docs
          .map((d) => d.data() as { index: number; content: string })
          .sort((a, b) => a.index - b.index)
          .map((p) => p.content);
        const blob = new Blob([parts.join("")], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        window.location.replace(url);
        setStatus("loading");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not open this mock.");
        setStatus("error");
      }
    });
  }, [mockId]);

  if (status === "auth") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Sign in to open this mock</h1>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link>
      </div>
    );
  }

  if (status === "error") {
    return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Could not open mock</h1><p className="mt-2 text-sm text-danger">{message}</p></div>;
  }

  return <div className="flex min-h-[70vh] items-center justify-center gap-3 text-sm text-muted"><Loader2 className="animate-spin text-brand" /> Opening your mock in this tab…</div>;
}

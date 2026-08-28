"use client";

import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export function showToast(message: string) {
  sessionStorage.setItem("achievers-toast", message);
  window.dispatchEvent(new Event("achievers-toast"));
}

export default function Toast() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const read = () => { const next = sessionStorage.getItem("achievers-toast"); if (next) { sessionStorage.removeItem("achievers-toast"); setMessage(next); } };
    read(); window.addEventListener("achievers-toast", read); return () => window.removeEventListener("achievers-toast", read);
  }, []);
  useEffect(() => { if (!message) return; const timeout = window.setTimeout(() => setMessage(""), 1000); return () => window.clearTimeout(timeout); }, [message]);
  return message ? <div role="status" className="fixed right-4 top-20 z-[100] flex items-center gap-2 rounded-xl bg-brand-darker px-4 py-3 text-sm font-semibold text-white shadow-xl"><CheckCircle2 size={17} />{message}</div> : null;
}

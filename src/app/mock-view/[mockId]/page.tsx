"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, getDocs, query, collection, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";

type Mock = { id: string; name: string; type: "full" | "sectional"; section?: string; durationMins: number; status: "published" | "draft" };
type SavedAttempt = { status: "in_progress" | "submitted"; answers?: Record<string, string>; score?: number; total?: number; correct?: number; wrong?: number };
type ResultMessage = { source: "achievers-mock"; type: "ready" | "started" | "submitted"; score?: number; total?: number; correct?: number; wrong?: number; answers?: Record<string, string>; secondsLeft?: number };

function addAchieversBridge(html: string) {
  const bridge = `<script>
    (function () {
      var sent = false;
      function send(type, extra) { window.parent.postMessage(Object.assign({ source: 'achievers-mock', type: type }, extra || {}), '*'); }
      function reportResult() {
        if (sent || typeof QUESTIONS === 'undefined' || typeof answers === 'undefined') return;
        sent = true;
        var correct = 0, wrong = 0, score = 0;
        QUESTIONS.forEach(function (q, index) {
          var answer = answers[index];
          if (!answer) return;
          var isCorrect = String(answer).trim() === String(q.correct).trim();
          if (isCorrect) { correct++; score += 3; }
          else { wrong++; if (q.q_type === 'MCQ') score -= 1; }
        });
        send('submitted', { score: score, total: QUESTIONS.length, correct: correct, wrong: wrong, answers: answers, secondsLeft: typeof secsLeft === 'number' ? secsLeft : 0 });
      }
      document.addEventListener('DOMContentLoaded', function () {
        var result = document.getElementById('result-screen');
        if (result) new MutationObserver(function () {
          if (getComputedStyle(result).display !== 'none') reportResult();
        }).observe(result, { attributes: true, attributeFilter: ['style'] });
        send('ready');
      });
      window.addEventListener('message', function (event) {
        var data = event.data || {};
        if (data.source !== 'achievers-platform') return;
        if (data.type === 'restore' && data.answers && typeof showResults === 'function') {
          window.__achieversAnalysis = true;
          answers = data.answers;
          submitted = true;
          if (typeof clearInterval === 'function' && typeof timerInt !== 'undefined') clearInterval(timerInt);
          showResults();
        }
      });
    })();
  </script>`;
  return html
    .replace("function startExam() {", "function startExam() { window.parent.postMessage({ source: 'achievers-mock', type: 'started' }, '*');")
    .replace("function retryExam() {", "function retryExam() { if (window.__achieversAnalysis) return;")
    .replace("</body>", `${bridge}</body>`);
}

export default function MockViewPage({ params }: { params: Promise<{ mockId: string }> }) {
  const [mockId, setMockId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mock, setMock] = useState<Mock | null>(null);
  const [attempt, setAttempt] = useState<SavedAttempt | null>(null);
  const [html, setHtml] = useState("");
  const [status, setStatus] = useState<"loading" | "auth" | "error">("loading");
  const [message, setMessage] = useState("");
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => { params.then((value) => setMockId(value.mockId)); }, [params]);
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    if (!mockId || !user) return;
    (async () => {
      try {
        const mockSnapshot = await getDoc(doc(db, "mocks", mockId));
        if (!mockSnapshot.exists() || mockSnapshot.data().status !== "published") throw new Error("This mock is not available.");
        const nextMock = { id: mockSnapshot.id, ...mockSnapshot.data() } as Mock;
        const attemptSnapshot = await getDoc(doc(db, "attempts", `${user.uid}_${mockId}`));
        const chunks = await getDocs(query(collection(db, "mock_file_chunks"), where("mockId", "==", mockId)));
        if (chunks.empty) throw new Error("This mock file is not available.");
        const source = chunks.docs.map((item) => item.data() as { index: number; content: string }).sort((a, b) => a.index - b.index).map((item) => item.content).join("");
        setMock(nextMock); setAttempt(attemptSnapshot.exists() ? attemptSnapshot.data() as SavedAttempt : null); setHtml(addAchieversBridge(source)); setStatus("loading");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not open this mock."); setStatus("error"); }
    })();
  }, [mockId, user]);

  useEffect(() => {
    const onMessage = async (event: MessageEvent<ResultMessage>) => {
      if (event.source !== frameRef.current?.contentWindow || !user || !mock || !mockId) return;
      const data = event.data;
      if (data?.source !== "achievers-mock") return;
      const attemptRef = doc(db, "attempts", `${user.uid}_${mockId}`);
      try {
        if (data.type === "started" && !attempt) {
          const started: SavedAttempt = { status: "in_progress" };
          await setDoc(attemptRef, { userId: user.uid, mockId, type: mock.type, section: mock.section || null, status: "in_progress", startedAt: serverTimestamp() });
          setAttempt(started);
        }
        if (data.type === "submitted" && attempt?.status !== "submitted") {
          await updateDoc(attemptRef, { status: "submitted", score: data.score || 0, total: data.total || 0, correct: data.correct || 0, wrong: data.wrong || 0, answers: data.answers || {}, timeTakenSeconds: Math.max(0, mock.durationMins * 60 - Number(data.secondsLeft || 0)), submittedAt: serverTimestamp() });
          setAttempt({ status: "submitted", score: data.score, total: data.total, correct: data.correct, wrong: data.wrong, answers: data.answers });
        }
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this attempt."); }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [attempt, mock, mockId, user]);

  function restoreAnalysis() {
    if (attempt?.status === "submitted" && attempt.answers) frameRef.current?.contentWindow?.postMessage({ source: "achievers-platform", type: "restore", answers: attempt.answers }, "*");
  }

  if (!user && status !== "error") return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Sign in to open this mock</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;
  if (status === "error") return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Could not open mock</h1><p className="mt-2 text-sm text-danger">{message}</p></div>;
  if (!html) return <div className="flex min-h-[70vh] items-center justify-center gap-3 text-sm text-muted"><Loader2 className="animate-spin text-brand" /> Opening your mock…</div>;
  return <div className="min-h-screen bg-surface-muted"><div className="border-b border-border bg-white px-4 py-2 text-center text-sm text-muted">{attempt?.status === "submitted" ? `Analysis mode · Score ${attempt.score}/${(attempt.total || 0) * 3}` : "Your attempt is saved automatically when you submit."}</div><iframe ref={frameRef} srcDoc={html} onLoad={restoreAnalysis} sandbox="allow-scripts allow-forms" title={mock?.name || "Mock"} className="min-h-[calc(100vh-41px)] w-full border-0" /></div>;
}

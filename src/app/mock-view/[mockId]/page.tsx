"use client";

import { useEffect, useRef, useState } from "react";
import { doc, getDoc, getDocs, query, collection, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Loader2, UserRound } from "lucide-react";
import Link from "next/link";
import { auth, db } from "@/lib/firebase/client";

type Mock = { id: string; name: string; type: "full" | "sectional"; section?: string; questions: number; durationMins: number; status: "published" | "draft" };
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
      function hideIntroForAnalysis() {
        var intro = document.querySelectorAll('#start-screen, #welcome-screen, #instructions-screen, #intro-screen, [data-screen="start"], [data-screen="intro"], [class*="instructions" i], [class*="rules" i]');
        intro.forEach(function (element) { element.style.display = 'none'; });
        Array.prototype.forEach.call(document.querySelectorAll('button, a'), function (control) {
          if (!/start exam/i.test((control.textContent || '').trim())) return;
          var container = control.closest('[id*="start" i], [class*="start" i], [id*="intro" i], [class*="intro" i]');
          if (container) container.style.display = 'none';
        });
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
          hideIntroForAnalysis();
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
  const attemptRef = useRef<SavedAttempt | null>(null);
  const mockRef = useRef<Mock | null>(null);

  useEffect(() => { attemptRef.current = attempt; }, [attempt]);
  useEffect(() => { mockRef.current = mock; }, [mock]);

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
      const attemptDocument = doc(db, "attempts", `${user.uid}_${mockId}`);
      try {
        if (data.type === "started" && !attempt) {
          const started: SavedAttempt = { status: "in_progress" };
          // Mark locally before the network request so closing immediately after
          // starting still queues the zero-score finalisation below.
          attemptRef.current = started;
          setAttempt(started);
          await setDoc(attemptDocument, { userId: user.uid, mockId, type: mock.type, section: mock.section || null, status: "in_progress", startedAt: serverTimestamp() });
        }
        if (data.type === "submitted" && attempt?.status !== "submitted") {
          await updateDoc(attemptDocument, { status: "submitted", score: data.score || 0, total: data.total || 0, correct: data.correct || 0, wrong: data.wrong || 0, answers: data.answers || {}, timeTakenSeconds: Math.max(0, mock.durationMins * 60 - Number(data.secondsLeft || 0)), submittedAt: serverTimestamp() });
          const submitted: SavedAttempt = { status: "submitted", score: data.score, total: data.total, correct: data.correct, wrong: data.wrong, answers: data.answers };
          attemptRef.current = submitted;
          setAttempt(submitted);
        }
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save this attempt."); }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [attempt, mock, mockId, user]);

  useEffect(() => {
    if (!user || !mockId) return;
    const recordAbandonedAttempt = () => {
      const currentAttempt = attemptRef.current;
      const currentMock = mockRef.current;
      if (currentAttempt?.status !== "in_progress" || !currentMock) return;
      void updateDoc(doc(db, "attempts", `${user.uid}_${mockId}`), {
        status: "submitted",
        score: 0,
        total: Number(currentMock.questions || 0),
        correct: 0,
        wrong: 0,
        answers: {},
        timeTakenSeconds: 0,
        submittedAt: serverTimestamp(),
      });
    };
    window.addEventListener("pagehide", recordAbandonedAttempt);
    return () => window.removeEventListener("pagehide", recordAbandonedAttempt);
  }, [mockId, user]);

  function restoreAnalysis() {
    if (attempt?.status === "submitted" && attempt.answers) frameRef.current?.contentWindow?.postMessage({ source: "achievers-platform", type: "restore", answers: attempt.answers }, "*");
  }

  if (!user) return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Sign in to open this mock</h1><Link href="/login" className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white">Continue with Google</Link></div>;
  if (status === "error") return <div className="mx-auto max-w-xl px-4 py-20 text-center"><h1 className="font-display text-2xl font-bold">Could not open mock</h1><p className="mt-2 text-sm text-danger">{message}</p></div>;
  if (!html) return <div className="flex min-h-[70vh] items-center justify-center gap-3 text-sm text-muted"><Loader2 className="animate-spin text-brand" /> Opening your mock…</div>;
  return <div className="min-h-screen bg-surface-muted"><div className="flex items-center justify-end border-b border-border bg-white px-4 py-2"><div className="flex items-center gap-2 text-sm font-medium text-foreground">{user.photoURL ? <img src={user.photoURL} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-tint text-brand-darker"><UserRound size={16} /></span>}<span>{user.displayName || "Student"}</span></div></div><iframe ref={frameRef} srcDoc={html} onLoad={restoreAnalysis} sandbox="allow-scripts allow-forms" title={mock?.name || "Mock"} className="min-h-[calc(100vh-49px)] w-full border-0" /></div>;
}

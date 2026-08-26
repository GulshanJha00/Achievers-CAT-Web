"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import AdminGuard from "@/components/AdminGuard";
import MediaInput from "@/components/MediaInput";
import type { MediaValue } from "@/lib/firebase/media";
import { uploadQuestionImage } from "@/lib/firebase/media";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const blankMedia = (): MediaValue => ({ type: "text", value: "" });

type DailyQuestion = {
  date: string;
  section: string;
  title: string;
  question: MediaValue;
  options: Array<{ label: string; content: MediaValue }>;
  correctOption: string;
  solution: MediaValue;
  explanation: MediaValue;
  difficulty: string;
  topic: string;
  published: boolean;
};

function normalizeMedia(value: unknown): MediaValue {
  if (!value || typeof value !== "object") return blankMedia();
  const v = value as { type?: "text" | "image"; value?: string };
  return { type: v.type === "image" ? "image" : "text", value: v.value || "" };
}

function emptyQuestion(date: string): DailyQuestion {
  return {
    date,
    section: "QA",
    title: "",
    question: blankMedia(),
    options: ["A", "B", "C", "D"].map((label) => ({ label, content: blankMedia() })),
    correctOption: "A",
    solution: blankMedia(),
    explanation: blankMedia(),
    difficulty: "Medium",
    topic: "",
    published: true,
  };
}

export default function AdminDailyPage() {
  return (
    <AdminGuard>
      <DailyEditor />
    </AdminGuard>
  );
}

function DailyEditor() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [data, setData] = useState<DailyQuestion>(() => emptyQuestion(new Date().toLocaleDateString("en-CA")));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDoc(doc(db, "daily_questions", date))
      .then((snap) => {
        if (!alive) return;
        if (!snap.exists()) {
          setData(emptyQuestion(date));
        } else {
          const d = snap.data();
          setData({
            date,
            section: d.section || "QA",
            title: d.title || "",
            question: normalizeMedia(d.question),
            options: Array.isArray(d.options) && d.options.length === 4
              ? d.options.map((o: { label?: string; content?: unknown }, i: number) => ({
                  label: o.label || ["A", "B", "C", "D"][i],
                  content: normalizeMedia(o.content),
                }))
              : emptyQuestion(date).options,
            correctOption: d.correctOption || "A",
            solution: normalizeMedia(d.solution),
            explanation: normalizeMedia(d.explanation),
            difficulty: d.difficulty || "Medium",
            topic: d.topic || "",
            published: d.published !== false,
          });
        }
      })
      .catch((error) => setMessage(error.message || "Could not load question."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [date]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const questionId = date;
      const resolveMedia = async (media: MediaValue): Promise<MediaValue> => {
        if (media.type !== "image") return { type: "text", value: media.value };
        if (media.file) {
          const assetId = await uploadQuestionImage(questionId, media.file);
          return { type: "image", value: assetId };
        }
        return { type: "image", value: media.value };
      };

      const question = await resolveMedia(data.question);
      const options = await Promise.all(data.options.map(async (o) => ({
        label: o.label,
        content: await resolveMedia(o.content),
      })));
      const solution = await resolveMedia(data.solution);
      const explanation = await resolveMedia(data.explanation);

      await setDoc(doc(db, "daily_questions", questionId), {
        date,
        section: data.section,
        title: data.title,
        question,
        options,
        correctOption: data.correctOption,
        solution,
        explanation,
        difficulty: data.difficulty,
        topic: data.topic,
        published: data.published,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      setData((current) => ({ ...current, question, options, solution, explanation }));
      setMessage("Question of the Day saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  function updateOption(index: number, content: MediaValue) {
    setData((current) => ({
      ...current,
      options: current.options.map((option, i) => i === index ? { ...option, content } : option),
    }));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-brand-darker"><ArrowLeft size={14} /> Admin</Link>
          <h1 className="mt-2 font-display text-[28px] font-bold">Question of the Day</h1>
          <p className="mt-1 text-[14px] text-muted">Every question, option, and solution can be text or an image.</p>
        </div>
        <button disabled={saving || loading} onClick={save} className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving…" : "Save & Publish"}
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="sm:col-span-1">
            <span className="text-[12px] font-semibold text-muted">Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand" />
          </label>
          <label>
            <span className="text-[12px] font-semibold text-muted">Section</span>
            <select value={data.section} onChange={(e) => setData({ ...data, section: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand">
              <option>VARC</option><option>DILR</option><option>QA</option>
            </select>
          </label>
          <label>
            <span className="text-[12px] font-semibold text-muted">Difficulty</span>
            <select value={data.difficulty} onChange={(e) => setData({ ...data, difficulty: e.target.value })} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand">
              <option>Easy</option><option>Medium</option><option>Hard</option>
            </select>
          </label>
          <label>
            <span className="text-[12px] font-semibold text-muted">Topic</span>
            <input value={data.topic} onChange={(e) => setData({ ...data, topic: e.target.value })} placeholder="Algebra" className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand" />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-[12px] font-semibold text-muted">Title</span>
          <input value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="e.g. Algebra — CAT Level" className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand" />
        </label>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted">Loading this date…</div>
      ) : (
        <div className="mt-6 space-y-4">
          <MediaInput label="Question" value={data.question} onChange={(question) => setData({ ...data, question })} />

          {data.options.map((option, index) => (
            <div key={option.label}>
              <MediaInput label={`Option ${option.label}`} value={option.content} onChange={(content) => updateOption(index, content)} multiline={false} />
            </div>
          ))}

          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-[13px] font-semibold">Correct answer</p>
            <div className="mt-3 flex gap-2">
              {data.options.map((option) => (
                <button type="button" key={option.label} onClick={() => setData({ ...data, correctOption: option.label })} className={`h-10 w-10 rounded-full text-sm font-bold ${data.correctOption === option.label ? "bg-brand text-white" : "border border-border bg-white text-foreground"}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <MediaInput label="Solution / Worked Answer" value={data.solution} onChange={(solution) => setData({ ...data, solution })} />
          <MediaInput label="Explanation (optional)" value={data.explanation} onChange={(explanation) => setData({ ...data, explanation })} />

          {message && <div className={`rounded-xl px-4 py-3 text-sm ${message.includes("successfully") ? "bg-brand-tint text-brand-darker" : "bg-red-50 text-danger"}`}>{message}</div>}
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import AdminGuard from "@/components/AdminGuard";
import MediaInput from "@/components/MediaInput";
import type { MediaValue } from "@/lib/firebase/media";
import { uploadQuestionImage } from "@/lib/firebase/media";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

const blankMedia = (): MediaValue => ({
  type: "text",
  value: "",
});

const labels = ["A", "B", "C", "D"];

type MCQ = {
  title: string;
  question: MediaValue;
  options: {
    label: string;
    content: MediaValue;
  }[];
  correctOption: string;
  solution: MediaValue;
  explanation: MediaValue;
};

type DailyPackage = {
  date: string;
  published: boolean;

  quant: MCQ[];

  varc: {
    type: "RC" | "VA";
    title: string;
    passage: MediaValue;
    questions: MCQ[];
  };

  dilr: {
    title: string;
    set: MediaValue;
    questions: MCQ[];
  };
};


// --------------------------------------------------
// QUESTION LIMITS
// --------------------------------------------------

const QUANT_LIMIT = 5;
const RC_LIMIT = 4;
const VA_LIMIT = 5;
const DILR_LIMIT = 5;

function getVarcLimit(type: "RC" | "VA") {
  return type === "RC" ? RC_LIMIT : VA_LIMIT;
}


// --------------------------------------------------
// EMPTY MCQ
// --------------------------------------------------

function emptyMCQ(): MCQ {
  return {
    title: "",
    question: blankMedia(),

    options: labels.map((label) => ({
      label,
      content: blankMedia(),
    })),

    correctOption: "A",

    solution: blankMedia(),

    explanation: blankMedia(),
  };
}


// --------------------------------------------------
// EMPTY PACKAGE
// --------------------------------------------------

function emptyPackage(date: string): DailyPackage {
  return {
    date,

    published: true,

    quant: Array.from(
      { length: QUANT_LIMIT },
      emptyMCQ
    ),

    varc: {
      type: "RC",
      title: "",
      passage: blankMedia(),

      questions: Array.from(
        { length: RC_LIMIT },
        emptyMCQ
      ),
    },

    dilr: {
      title: "",
      set: blankMedia(),

      questions: Array.from(
        { length: DILR_LIMIT },
        emptyMCQ
      ),
    },
  };
}


// --------------------------------------------------
// NORMALIZE MEDIA
// --------------------------------------------------

function normalizeMedia(
  value: unknown
): MediaValue {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return blankMedia();
  }

  const v = value as {
    type?: string;
    value?: string;
  };

  return {
    type:
      v.type === "image"
        ? "image"
        : "text",

    value: v.value || "",
  };
}


// --------------------------------------------------
// NORMALIZE MCQ
// --------------------------------------------------

function normalizeMCQ(value: any): MCQ {
  return {
    title: value?.title || "",

    question: normalizeMedia(
      value?.question
    ),

    options: labels.map(
      (label, i) => ({
        label,

        content: normalizeMedia(
          value?.options?.[i]?.content
        ),
      })
    ),

    correctOption:
      value?.correctOption || "A",

    solution: normalizeMedia(
      value?.solution
    ),

    explanation: normalizeMedia(
      value?.explanation
    ),
  };
}


// --------------------------------------------------
// NORMALIZE PACKAGE
// --------------------------------------------------

function normalizePackage(
  date: string,
  raw: any
): DailyPackage {

  if (
    Array.isArray(raw?.quant) ||
    raw?.varc ||
    raw?.dilr
  ) {

    const varcType =
      raw?.varc?.type === "VA"
        ? "VA"
        : "RC";

    const varcLimit =
      getVarcLimit(varcType);

    const rawVarcQuestions =
      Array.isArray(
        raw?.varc?.questions
      )
        ? raw.varc.questions
        : [];

    return {
      date,

      published:
        raw.published !== false,

      // Always keep Quant at 5.
      quant: Array.from(
        { length: QUANT_LIMIT },
        (_, i) =>
          normalizeMCQ(
            raw?.quant?.[i]
          )
      ),

      varc: {
        type: varcType,

        title:
          raw?.varc?.title || "",

        passage:
          normalizeMedia(
            raw?.varc?.passage
          ),

        // RC = 4
        // VA = 5
        questions: Array.from(
          { length: varcLimit },
          (_, i) =>
            normalizeMCQ(
              rawVarcQuestions[i]
            )
        ),
      },

      // Always keep DILR at 5.
      dilr: {
        title:
          raw?.dilr?.title || "",

        set:
          normalizeMedia(
            raw?.dilr?.set
          ),

        questions: Array.from(
          { length: DILR_LIMIT },
          (_, i) =>
            normalizeMCQ(
              raw?.dilr?.questions?.[i]
            )
        ),
      },
    };
  }


  // --------------------------------------------------
  // BACKWARD COMPATIBILITY
  // --------------------------------------------------

  if (raw?.question) {

    const old = normalizeMCQ(raw);

    return {
      date,

      published:
        raw.published !== false,

      quant:
        raw.section === "QA"
          ? [old]
          : Array.from(
              {
                length:
                  QUANT_LIMIT,
              },
              emptyMCQ
            ),

      varc: {
        type: "RC",

        title:
          raw.title || "",

        passage:
          blankMedia(),

        questions:
          raw.section === "VARC"
            ? [old]
            : Array.from(
                {
                  length:
                    RC_LIMIT,
                },
                emptyMCQ
              ),
      },

      dilr: {
        title:
          raw.title || "",

        set:
          blankMedia(),

        questions:
          raw.section === "DILR"
            ? [old]
            : Array.from(
                {
                  length:
                    DILR_LIMIT,
                },
                emptyMCQ
              ),
      },
    };
  }


  return emptyPackage(date);
}


// --------------------------------------------------
// MAIN ADMIN PAGE
// --------------------------------------------------

export default function AdminDailyPage() {
  return (
    <AdminGuard>
      <DailyEditor />
    </AdminGuard>
  );
}


// --------------------------------------------------
// DAILY EDITOR
// --------------------------------------------------

function DailyEditor() {

  const today =
    new Date().toLocaleDateString(
      "en-CA"
    );

  const [date, setDate] =
    useState(today);

  const [data, setData] =
    useState<DailyPackage>(
      () =>
        emptyPackage(today)
    );

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");


  // --------------------------------------------------
  // LOAD DATE
  // --------------------------------------------------

  useEffect(() => {

    let alive = true;

    setLoading(true);

    getDoc(
      doc(
        db,
        "daily_packages",
        date
      )
    )

      .then((snap) => {

        if (!alive) return;

        if (snap.exists()) {

          setData(
            normalizePackage(
              date,
              snap.data()
            )
          );

        } else {

          setData(
            emptyPackage(date)
          );
        }
      })

      .catch((error) => {

        setMessage(
          error.message ||
          "Could not load this date."
        );
      })

      .finally(() => {

        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };

  }, [date]);


  // --------------------------------------------------
  // RESOLVE MEDIA
  // --------------------------------------------------

  async function resolveMedia(
    media: MediaValue,
    assetId: string
  ): Promise<MediaValue> {

    if (media.type !== "image") {

      return {
        type: "text",
        value: media.value,
      };
    }

    if (media.file) {

      const id =
        await uploadQuestionImage(
          assetId,
          media.file
        );

      return {
        type: "image",
        value: id,
      };
    }

    return {
      type: "image",
      value: media.value,
    };
  }


  // --------------------------------------------------
  // RESOLVE MCQ
  // --------------------------------------------------

  async function resolveMCQ(
    q: MCQ,
    id: string
  ): Promise<MCQ> {

    return {
      title: q.title,

      question:
        await resolveMedia(
          q.question,
          `${id}-question`
        ),

      options:
        await Promise.all(
          q.options.map(
            async (o) => ({
              label: o.label,

              content:
                await resolveMedia(
                  o.content,
                  `${id}-option-${o.label}`
                ),
            })
          )
        ),

      correctOption:
        q.correctOption,

      solution:
        await resolveMedia(
          q.solution,
          `${id}-solution`
        ),

      explanation:
        await resolveMedia(
          q.explanation,
          `${id}-explanation`
        ),
    };
  }


  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------

  async function save() {

    setSaving(true);
    setMessage("");

    try {

      // ----------------------------------------------
      // ENSURE CORRECT QUESTION COUNTS
      // ----------------------------------------------

      if (
        data.quant.length !==
        QUANT_LIMIT
      ) {
        throw new Error(
          `Quantitative Aptitude must have exactly ${QUANT_LIMIT} questions.`
        );
      }

      const requiredVarc =
        getVarcLimit(
          data.varc.type
        );

      if (
        data.varc.questions.length !==
        requiredVarc
      ) {

        throw new Error(
          `${data.varc.type} must have exactly ${requiredVarc} questions.`
        );
      }

      if (
        data.dilr.questions.length !==
        DILR_LIMIT
      ) {

        throw new Error(
          `DILR must have exactly ${DILR_LIMIT} questions.`
        );
      }


      // ----------------------------------------------
      // RESOLVE QUESTIONS
      // ----------------------------------------------

      const quant =
        await Promise.all(
          data.quant.map(
            (q, i) =>
              resolveMCQ(
                q,
                `${date}-quant-${i + 1}`
              )
          )
        );


      const varcQuestions =
        await Promise.all(
          data.varc.questions.map(
            (q, i) =>
              resolveMCQ(
                q,
                `${date}-varc-${i + 1}`
              )
          )
        );


      const dilrQuestions =
        await Promise.all(
          data.dilr.questions.map(
            (q, i) =>
              resolveMCQ(
                q,
                `${date}-dilr-${i + 1}`
              )
          )
        );


      const varcPassage =
        await resolveMedia(
          data.varc.passage,
          `${date}-varc-passage`
        );


      const dilrSet =
        await resolveMedia(
          data.dilr.set,
          `${date}-dilr-set`
        );


      // ----------------------------------------------
      // SAVE FIRESTORE
      // ----------------------------------------------

      await setDoc(
        doc(
          db,
          "daily_packages",
          date
        ),
        {
          date,

          published:
            data.published,

          quant,

          varc: {
            ...data.varc,

            passage:
              varcPassage,

            questions:
              varcQuestions,
          },

          dilr: {
            ...data.dilr,

            set:
              dilrSet,

            questions:
              dilrQuestions,
          },

          updatedAt:
            serverTimestamp(),
        },
        {
          merge: true,
        }
      );


      // ----------------------------------------------
      // UPDATE LOCAL STATE
      // ----------------------------------------------

      setData(
        (current) => ({
          ...current,

          quant,

          varc: {
            ...current.varc,

            passage:
              varcPassage,

            questions:
              varcQuestions,
          },

          dilr: {
            ...current.dilr,

            set:
              dilrSet,

            questions:
              dilrQuestions,
          },
        })
      );


      setMessage(
        `Daily Practice package saved successfully. ${data.varc.type} contains ${requiredVarc} questions.`
      );

    } catch (error) {

      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save Daily Practice."
      );

    } finally {

      setSaving(false);
    }
  }


  // --------------------------------------------------
  // UPDATE QUESTION
  // --------------------------------------------------

  function updateQuestion(
    section:
      | "quant"
      | "varc"
      | "dilr",

    index: number,

    patch: Partial<MCQ>
  ) {

    setData((current) => {

      if (section === "quant") {

        return {
          ...current,

          quant:
            current.quant.map(
              (q, i) =>
                i === index
                  ? {
                      ...q,
                      ...patch,
                    }
                  : q
            ),
        };
      }


      if (section === "varc") {

        return {
          ...current,

          varc: {
            ...current.varc,

            questions:
              current.varc.questions.map(
                (q, i) =>
                  i === index
                    ? {
                        ...q,
                        ...patch,
                      }
                    : q
              ),
          },
        };
      }


      return {
        ...current,

        dilr: {
          ...current.dilr,

          questions:
            current.dilr.questions.map(
              (q, i) =>
                i === index
                  ? {
                      ...q,
                      ...patch,
                    }
                  : q
            ),
        },
      };
    });
  }


  // --------------------------------------------------
  // UPDATE OPTION
  // --------------------------------------------------

  function updateOption(
    section:
      | "quant"
      | "varc"
      | "dilr",

    qi: number,

    oi: number,

    content: MediaValue
  ) {

    setData((current) => {

      const patchList =
        (list: MCQ[]) =>
          list.map(
            (q, i) =>
              i === qi
                ? {
                    ...q,

                    options:
                      q.options.map(
                        (o, j) =>
                          j === oi
                            ? {
                                ...o,
                                content,
                              }
                            : o
                      ),
                  }
                : q
          );


      if (section === "quant") {

        return {
          ...current,

          quant:
            patchList(
              current.quant
            ),
        };
      }


      if (section === "varc") {

        return {
          ...current,

          varc: {
            ...current.varc,

            questions:
              patchList(
                current.varc.questions
              ),
          },
        };
      }


      return {
        ...current,

        dilr: {
          ...current.dilr,

          questions:
            patchList(
              current.dilr.questions
            ),
        },
      };
    });
  }


  // --------------------------------------------------
  // ADD QUESTION
  // --------------------------------------------------

  function addQuestion(
    section:
      | "quant"
      | "varc"
      | "dilr"
  ) {

    setData((current) => {

      // ----------------------------------------------
      // QUANT
      // ----------------------------------------------

      if (
        section === "quant"
      ) {

        if (
          current.quant.length >=
          QUANT_LIMIT
        ) {
          return current;
        }

        return {
          ...current,

          quant: [
            ...current.quant,
            emptyMCQ(),
          ],
        };
      }


      // ----------------------------------------------
      // VARC
      // ----------------------------------------------

      if (
        section === "varc"
      ) {

        const limit =
          getVarcLimit(
            current.varc.type
          );

        if (
          current.varc.questions.length >=
          limit
        ) {
          return current;
        }

        return {
          ...current,

          varc: {
            ...current.varc,

            questions: [
              ...current.varc.questions,
              emptyMCQ(),
            ],
          },
        };
      }


      // ----------------------------------------------
      // DILR
      // ----------------------------------------------

      if (
        current.dilr.questions.length >=
        DILR_LIMIT
      ) {
        return current;
      }

      return {
        ...current,

        dilr: {
          ...current.dilr,

          questions: [
            ...current.dilr.questions,
            emptyMCQ(),
          ],
        },
      };
    });
  }


  // --------------------------------------------------
  // REMOVE QUESTION
  // --------------------------------------------------

  function removeQuestion(
    section:
      | "quant"
      | "varc"
      | "dilr",

    index: number
  ) {

    setData((current) => {

      if (
        section === "quant"
      ) {

        return {
          ...current,

          quant:
            current.quant.filter(
              (_, i) =>
                i !== index
            ),
        };
      }


      if (
        section === "varc"
      ) {

        return {
          ...current,

          varc: {
            ...current.varc,

            questions:
              current.varc.questions.filter(
                (_, i) =>
                  i !== index
              ),
          },
        };
      }


      return {
        ...current,

        dilr: {
          ...current.dilr,

          questions:
            current.dilr.questions.filter(
              (_, i) =>
                i !== index
            ),
        },
      };
    });
  }


  // --------------------------------------------------
  // CHANGE VARC TYPE
  // --------------------------------------------------

  function changeVarcType(
    type: "RC" | "VA"
  ) {

    setData((current) => {

      const limit =
        getVarcLimit(type);

      let questions =
        current.varc.questions;


      // ----------------------------------------------
      // IF SWITCHING TO RC
      // ----------------------------------------------

      if (
        type === "RC" &&
        questions.length > RC_LIMIT
      ) {

        questions =
          questions.slice(
            0,
            RC_LIMIT
          );
      }


      // ----------------------------------------------
      // IF SWITCHING TO VA
      // ----------------------------------------------

      if (
        type === "VA" &&
        questions.length < VA_LIMIT
      ) {

        questions = [
          ...questions,

          ...Array.from(
            {
              length:
                VA_LIMIT -
                questions.length,
            },
            emptyMCQ
          ),
        ];
      }


      // Safety normalization
      questions =
        questions.slice(
          0,
          limit
        );


      return {
        ...current,

        varc: {
          ...current.varc,

          type,

          questions,
        },
      };
    });

    setMessage("");
  }


  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">

        <div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-brand-darker"
          >
            <ArrowLeft size={14} />
            Admin
          </Link>

          <h1 className="mt-2 font-display text-[28px] font-bold">
            Daily Practice
          </h1>

          <p className="mt-1 text-[14px] text-muted">
            Build one complete daily CAT practice package:
            Quant + VARC + DILR.
          </p>

        </div>


        <div className="flex items-center gap-2">

          <button
            disabled={
              saving ||
              loading
            }
            onClick={save}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
          >

            {saving ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <Save size={16} />
            )}

            {saving
              ? "Saving…"
              : "Save & Publish"}

          </button>

        </div>

      </div>


      {/* DATE */}

      <div className="mt-6 rounded-2xl border border-border bg-white p-5">

        <div className="flex flex-wrap items-end gap-4">

          <label className="w-full max-w-xs">

            <span className="text-[12px] font-semibold text-muted">
              Practice date
            </span>

            <input
              type="date"
              value={date}
              onChange={(e) =>
                setDate(
                  e.target.value
                )
              }
              className="mt-1.5 w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-brand"
            />

          </label>


          <label className="inline-flex items-center gap-2 pb-2 text-sm font-semibold">

            <input
              type="checkbox"
              checked={
                data.published
              }
              onChange={(e) =>
                setData({
                  ...data,
                  published:
                    e.target.checked,
                })
              }
            />

            Publish for students

          </label>

        </div>

      </div>


      {/* CONTENT */}

      {loading ? (

        <div className="py-16 text-center text-sm text-muted">
          Loading this date…
        </div>

      ) : (

        <div className="mt-6 space-y-8">

          {/* ======================================== */}
          {/* QUANT */}
          {/* ======================================== */}

          <section className="rounded-2xl border border-border bg-white p-5">

            <SectionHeading
              title="Quantitative Aptitude"
              subtitle={`${data.quant.length} / ${QUANT_LIMIT} questions`}
            />

            <div className="mt-5 space-y-5">

              {data.quant.map(
                (q, i) => (

                  <QuestionEditor
                    key={i}
                    number={i + 1}
                    question={q}
                    section="quant"
                    onPatch={(patch) =>
                      updateQuestion(
                        "quant",
                        i,
                        patch
                      )
                    }
                    onOption={(
                      oi,
                      content
                    ) =>
                      updateOption(
                        "quant",
                        i,
                        oi,
                        content
                      )
                    }
                    onRemove={
                      data.quant.length >
                      1
                        ? () =>
                            removeQuestion(
                              "quant",
                              i
                            )
                        : undefined
                    }
                  />

                )
              )}

            </div>


            <AddButton
              onClick={() =>
                addQuestion(
                  "quant"
                )
              }
              label="Add Quant Question"
              disabled={
                data.quant.length >=
                QUANT_LIMIT
              }
            />

          </section>


          {/* ======================================== */}
          {/* VARC */}
          {/* ======================================== */}

          <section className="rounded-2xl border border-border bg-white p-5">

            <SectionHeading
              title="VARC"
              subtitle={
                data.varc.type === "RC"
                  ? `RC · ${data.varc.questions.length} / ${RC_LIMIT} questions`
                  : `VA · ${data.varc.questions.length} / ${VA_LIMIT} questions`
              }
            />


            {/* TYPE SELECTOR */}

            <div className="mt-4 flex gap-2 rounded-full border border-border bg-surface-muted p-1 w-fit">

              {(
                ["RC", "VA"] as const
              ).map((type) => (

                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    changeVarcType(
                      type
                    )
                  }
                  className={`rounded-full px-4 py-2 text-xs font-bold ${
                    data.varc.type ===
                    type
                      ? "bg-brand text-white"
                      : "text-muted"
                  }`}
                >

                  {type ===
                  "RC"
                    ? "RC · 1 Passage + 4 Questions"
                    : "VA · 5 Questions"}

                </button>

              ))}

            </div>


            {/* TITLE */}

            <input
              value={
                data.varc.title
              }
              onChange={(e) =>
                setData({
                  ...data,

                  varc: {
                    ...data.varc,

                    title:
                      e.target.value,
                  },
                })
              }
              placeholder={
                data.varc.type ===
                "RC"
                  ? "RC title"
                  : "VA title"
              }
              className="mt-4 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            />


            {/* RC PASSAGE */}

            {data.varc.type ===
              "RC" && (

              <div className="mt-5">

                <MediaInput
                  label="RC Passage"
                  value={
                    data.varc.passage
                  }
                  onChange={(
                    passage
                  ) =>
                    setData({
                      ...data,

                      varc: {
                        ...data.varc,

                        passage,
                      },
                    })
                  }
                />

              </div>

            )}


            {/* VARC QUESTIONS */}

            <div className="mt-5 space-y-5">

              {data.varc.questions.map(
                (q, i) => (

                  <QuestionEditor
                    key={i}
                    number={i + 1}
                    question={q}
                    section="varc"
                    onPatch={(patch) =>
                      updateQuestion(
                        "varc",
                        i,
                        patch
                      )
                    }
                    onOption={(
                      oi,
                      content
                    ) =>
                      updateOption(
                        "varc",
                        i,
                        oi,
                        content
                      )
                    }
                    onRemove={
                      data.varc
                        .questions
                        .length > 1
                        ? () =>
                            removeQuestion(
                              "varc",
                              i
                            )
                        : undefined
                    }
                  />

                )
              )}

            </div>


            {/* ADD VARC */}

            <AddButton
              onClick={() =>
                addQuestion(
                  "varc"
                )
              }
              label={
                data.varc.type ===
                "RC"
                  ? "Add RC Question"
                  : "Add VA Question"
              }
              disabled={
                data.varc.questions
                  .length >=
                getVarcLimit(
                  data.varc.type
                )
              }
            />

          </section>


          {/* ======================================== */}
          {/* DILR */}
          {/* ======================================== */}

          <section className="rounded-2xl border border-border bg-white p-5">

            <SectionHeading
              title="DILR"
              subtitle={`${data.dilr.questions.length} / ${DILR_LIMIT} questions`}
            />

            <input
              value={
                data.dilr.title
              }
              onChange={(e) =>
                setData({
                  ...data,

                  dilr: {
                    ...data.dilr,

                    title:
                      e.target.value,
                  },
                })
              }
              placeholder="DILR set title"
              className="mt-4 w-full rounded-xl border border-border px-3 py-2.5 text-sm"
            />


            <div className="mt-5">

              <MediaInput
                label="Set / Case / Data"
                value={
                  data.dilr.set
                }
                onChange={(set) =>
                  setData({
                    ...data,

                    dilr: {
                      ...data.dilr,

                      set,
                    },
                  })
                }
              />

            </div>


            <div className="mt-5 space-y-5">

              {data.dilr.questions.map(
                (q, i) => (

                  <QuestionEditor
                    key={i}
                    number={i + 1}
                    question={q}
                    section="dilr"
                    onPatch={(patch) =>
                      updateQuestion(
                        "dilr",
                        i,
                        patch
                      )
                    }
                    onOption={(
                      oi,
                      content
                    ) =>
                      updateOption(
                        "dilr",
                        i,
                        oi,
                        content
                      )
                    }
                    onRemove={
                      data.dilr
                        .questions
                        .length > 1
                        ? () =>
                            removeQuestion(
                              "dilr",
                              i
                            )
                        : undefined
                    }
                  />

                )
              )}

            </div>


            <AddButton
              onClick={() =>
                addQuestion(
                  "dilr"
                )
              }
              label="Add DILR Question"
              disabled={
                data.dilr.questions
                  .length >=
                DILR_LIMIT
              }
            />

          </section>


          {/* MESSAGE */}

          {message && (

            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                message.includes(
                  "successfully"
                )
                  ? "bg-brand-tint text-brand-darker"
                  : "bg-red-50 text-danger"
              }`}
            >
              {message}
            </div>

          )}

        </div>

      )}

    </div>
  );
}


// --------------------------------------------------
// SECTION HEADING
// --------------------------------------------------

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {

  return (
    <div>

      <h2 className="font-display text-xl font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-muted">
        {subtitle}
      </p>

    </div>
  );
}


// --------------------------------------------------
// ADD BUTTON
// --------------------------------------------------

function AddButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) {

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-5 inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-tint px-4 py-2 text-xs font-bold text-brand-darker hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-40"
    >

      <Plus size={14} />

      {disabled
        ? `${label} · Limit reached`
        : label}

    </button>
  );
}


// --------------------------------------------------
// QUESTION EDITOR
// --------------------------------------------------

function QuestionEditor({
  number,
  question,
  section,
  onPatch,
  onOption,
  onRemove,
}: {
  number: number;
  question: MCQ;
  section: string;
  onPatch: (
    patch: Partial<MCQ>
  ) => void;
  onOption: (
    index: number,
    content: MediaValue
  ) => void;
  onRemove?: () => void;
}) {

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 sm:p-5">

      <div className="flex items-center justify-between gap-3">

        <h3 className="text-sm font-bold">
          Question {number}
        </h3>

        {onRemove && (

          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-danger hover:bg-red-50"
          >

            <Trash2 size={14} />

            Remove

          </button>

        )}

      </div>


      <input
        value={
          question.title
        }
        onChange={(e) =>
          onPatch({
            title:
              e.target.value,
          })
        }
        placeholder={`Optional ${section.toUpperCase()} question title`}
        className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm"
      />


      <div className="mt-4">

        <MediaInput
          label="Question"
          value={
            question.question
          }
          onChange={(value) =>
            onPatch({
              question:
                value,
            })
          }
        />

      </div>


      <div className="mt-4 grid gap-3 sm:grid-cols-2">

        {question.options.map(
          (option, oi) => (

            <MediaInput
              key={
                option.label
              }
              label={`Option ${option.label}`}
              value={
                option.content
              }
              multiline={
                false
              }
              onChange={(
                value
              ) =>
                onOption(
                  oi,
                  value
                )
              }
            />

          )
        )}

      </div>


      <div className="mt-4 flex flex-wrap items-center gap-2">

        <span className="text-xs font-bold">
          Correct:
        </span>

        {question.options.map(
          (o) => (

            <button
              type="button"
              key={o.label}
              onClick={() =>
                onPatch({
                  correctOption:
                    o.label,
                })
              }
              className={`h-9 w-9 rounded-full text-xs font-bold ${
                question.correctOption ===
                o.label
                  ? "bg-brand text-white"
                  : "border border-border bg-white"
              }`}
            >
              {o.label}
            </button>

          )
        )}

      </div>


      <div className="mt-4">

        <MediaInput
          label="Solution / Worked Answer"
          value={
            question.solution
          }
          onChange={(value) =>
            onPatch({
              solution:
                value,
            })
          }
        />

      </div>


      <div className="mt-4">

        <MediaInput
          label="Explanation (optional)"
          value={
            question.explanation
          }
          onChange={(value) =>
            onPatch({
              explanation:
                value,
            })
          }
        />

      </div>

    </div>
  );
}
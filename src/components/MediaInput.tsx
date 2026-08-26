"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Type, X, Upload } from "lucide-react";
import type { MediaValue } from "@/lib/firebase/media";
import { getQuestionAsset } from "@/lib/firebase/media";

export default function MediaInput({
  label,
  value,
  onChange,
  multiline = true,
}: {
  label: string;
  value: MediaValue;
  onChange: (value: MediaValue) => void;
  multiline?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (value.type === "image" && value.value) {
      if (value.value.startsWith("data:") || value.value.startsWith("blob:")) {
        setPreview(value.value);
      } else {
        getQuestionAsset(value.value).then((asset) => {
          if (alive) setPreview(asset?.dataUrl || null);
        });
      }
    } else {
      setPreview(null);
    }
    return () => {
      alive = false;
    };
  }, [value.type, value.value]);

  function chooseText() {
    onChange({ type: "text", value: value.type === "text" ? value.value : "", file: null });
  }

  function chooseImage() {
    onChange({ type: "image", value: value.type === "image" ? value.value : "", file: value.file ?? null });
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    onChange({ type: "image", value: objectUrl, file });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        <div className="flex rounded-full border border-border bg-white p-1">
          <button type="button" onClick={chooseText} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${value.type === "text" ? "bg-brand text-white" : "text-muted"}`}>
            <Type size={13} /> Text
          </button>
          <button type="button" onClick={chooseImage} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ${value.type === "image" ? "bg-brand text-white" : "text-muted"}`}>
            <ImagePlus size={13} /> Image
          </button>
        </div>
      </div>

      {value.type === "text" ? (
        multiline ? (
          <textarea
            value={value.value}
            onChange={(e) => onChange({ type: "text", value: e.target.value })}
            rows={4}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand"
          />
        ) : (
          <input
            value={value.value}
            onChange={(e) => onChange({ type: "text", value: e.target.value })}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className="mt-3 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand"
          />
        )
      ) : (
        <div className="mt-3">
          {preview ? (
            <div className="relative overflow-hidden rounded-xl border border-border bg-white p-2">
              <img src={preview} alt={`${label} preview`} className="max-h-80 w-full object-contain" />
              <button type="button" onClick={() => { setPreview(null); onChange({ type: "image", value: "", file: null }); }} className="absolute right-3 top-3 rounded-full bg-white p-2 shadow-md" aria-label={`Remove ${label}`}>
                <X size={15} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-brand/40 bg-white px-4 py-8 text-center hover:bg-brand-tint">
              <Upload size={22} className="text-brand-dark" />
              <span className="mt-2 text-[13px] font-semibold text-foreground">Choose image</span>
              <span className="mt-1 text-[12px] text-muted">PNG, JPG, WEBP — compressed automatically</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

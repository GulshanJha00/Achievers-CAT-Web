import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./client";

export type MediaValue = {
  type: "text" | "image";
  value: string;
  file?: File | null;
};

export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL("image/webp", quality);
  while (dataUrl.length > 600_000 && quality > 0.45) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/webp", quality);
  }
  if (dataUrl.length > 900_000) {
    throw new Error("This image is too large. Please choose a smaller image.");
  }
  return dataUrl;
}

export async function uploadQuestionImage(questionId: string, file: File) {
  const dataUrl = await compressImage(file);
  const snap = await addDoc(collection(db, "question_assets"), {
    questionId,
    dataUrl,
    contentType: "image/webp",
    createdAt: serverTimestamp(),
  });
  return snap.id;
}

export async function getQuestionAsset(assetId: string) {
  const snap = await getDoc(doc(db, "question_assets", assetId));
  if (!snap.exists()) return null;
  return snap.data() as { dataUrl: string; contentType?: string };
}

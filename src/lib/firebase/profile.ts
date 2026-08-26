import { doc, getDoc } from "firebase/firestore";
import { db } from "./client";

export type Profile = {
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: "admin" | "student";
};

export async function getProfile(uid: string): Promise<Profile | null> {
  const snap = await getDoc(doc(db, "profiles", uid));
  return snap.exists() ? (snap.data() as Profile) : null;
}

export async function isAdminUser(uid: string) {
  const profile = await getProfile(uid);
  return profile?.role === "admin";
}

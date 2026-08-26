"use client";

import {
  GoogleAuthProvider,
  browserLocalPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
  type UserCredential,
} from "firebase/auth";
import { auth, googleProvider } from "./client";

export async function signInWithGoogle(): Promise<UserCredential> {
  await setPersistence(auth, browserLocalPersistence);
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

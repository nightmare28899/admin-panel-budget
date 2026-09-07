"use client";

import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirebaseAuth } from "./firebaseClient";

export async function signInWithGoogle() {
  const auth = await getFirebaseAuth();
  const result = await signInWithPopup(auth, new GoogleAuthProvider());
  try { return await result.user.getIdToken(); } finally { await signOut(auth); }
}

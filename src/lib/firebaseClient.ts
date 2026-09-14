import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, inMemoryPersistence } from "firebase/auth";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseConfigured() { return Object.values(config).every((value) => typeof value === "string" && value.length > 0); }
export async function getFirebaseAuth() {
  // "googleSignInUnavailable" is a stable i18n message key (see
  // src/i18n/messages.ts) — this file can't call t() itself, so UI call
  // sites resolve it via frontendError()/t() before displaying it.
  if (!firebaseConfigured()) throw new Error("googleSignInUnavailable");
  const app = getApps()[0] ?? initializeApp(config);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  return auth;
}

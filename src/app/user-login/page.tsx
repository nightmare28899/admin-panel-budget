"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { userGoogleLoginAction, userLoginAction } from "@/lib/userActions";
import { signInWithGoogle } from "@/lib/googleAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

function SessionExpiredNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("reason") !== "expired") return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]"
    >
      Your session expired. Please sign in again.
    </div>
  );
}

export default function UserLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await userLoginAction(email.trim(), password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push("/finance");
  }

  async function googleLogin() {
    setError(null);
    setGoogleLoading(true);
    try {
      const token = await signInWithGoogle();
      const result = await userGoogleLoginAction(token);
      if (result.error) setError(result.error);
      else router.push("/finance");
    } catch (reason) {
      const code = typeof reason === "object" && reason !== null && "code" in reason ? String(reason.code) : "";
      setError(code.includes("popup-closed") || code.includes("cancelled") ? "Google sign-in was cancelled." : reason instanceof Error ? reason.message : "Google sign-in failed.");
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-0)] p-6">
      <AmbientBackground variant="auth" />
      <Card className="relative z-10 w-full max-w-md">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-3)] transition-colors hover:text-[var(--emerald-text)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
        >
          <span aria-hidden="true">←</span>
          Back to platform selection
        </Link>
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--emerald)]">
            <span className="font-serif text-lg leading-none text-[var(--bg-0)]">B</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text-1)]">Budget Panel</span>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[var(--text-1)]">Personal finance</h1>
        <p className="mt-1.5 mb-6 text-sm text-[var(--text-3)]">Sign in with an existing Budget account.</p>

        <Suspense fallback={null}>
          <SessionExpiredNotice />
        </Suspense>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-[var(--rose)]/40 bg-[var(--rose)]/10 px-4 py-3 text-sm text-[var(--rose)]">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="user-login-email" className="mb-1 block text-sm text-[var(--text-2)]">Email</label>
            <input
              id="user-login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="user-login-password" className="mb-1 block text-sm text-[var(--text-2)]">Password</label>
            <input
              id="user-login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="input"
            />
          </div>
          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-[var(--text-3)]">
          <div className="h-px flex-1 bg-[var(--border-soft)]" />
          or
          <div className="h-px flex-1 bg-[var(--border-soft)]" />
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={googleLoading}
          onClick={googleLogin}
          aria-label="Continue with Google"
          className="w-full"
        >
          {googleLoading ? "Connecting..." : "Continue with Google"}
        </Button>
      </Card>
    </main>
  );
}

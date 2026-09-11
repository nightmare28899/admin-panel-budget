"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { Button } from "@/components/ui/Button";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [shakeForm, setShakeForm] = useState(false);

    useEffect(() => {
        if (!toast) return;
        const timeout = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timeout);
    }, [toast]);

    const showToast = (message: string, type: "success" | "error" = "success") => {
        setToast({ message, type });
    };

    const triggerErrorFeedback = () => {
        setShakeForm(false);
        requestAnimationFrame(() => setShakeForm(true));
    };

    async function onSubmit(e: FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await loginAction(email, password);

            if (res.error) {
                setError(res.error);
                triggerErrorFeedback();
                showToast(res.error, "error");
                setLoading(false);
                return;
            }

            if (res.success) {
                router.push("/dashboard/users");
                return;
            }

            setLoading(false);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Login failed";
            setError(message);
            triggerErrorFeedback();
            showToast(message, "error");
            setLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--bg-0)] p-6">
            <AmbientBackground variant="auth" />
            {toast && (
                <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
                    <div
                        role="status"
                        aria-live="polite"
                        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm ${
                            toast.type === "error"
                                ? "border-[var(--rose)]/40 bg-[var(--rose-dim)] text-[var(--rose-text)]"
                                : "border-[var(--emerald)]/40 bg-[var(--emerald-dim)] text-[var(--emerald-text)]"
                        }`}
                    >
                        <span className="mt-0.5 text-base" aria-hidden>
                            {toast.type === "error" ? "⚠️" : "✅"}
                        </span>
                        <p className="flex-1 font-medium">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="cursor-pointer rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--text-2)] transition-colors hover:bg-[var(--bg-3)]"
                            aria-label="Dismiss notification"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div
                className={`relative z-10 w-full max-w-md rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--bg-2)]/70 p-6 shadow-sm backdrop-blur-xl transition-colors hover:border-[var(--border)] sm:p-8 ${
                    shakeForm ? "animate-login-shake" : ""
                }`}
                onAnimationEnd={() => setShakeForm(false)}
            >
                <Link
                    href="/"
                    className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[var(--text-3)] transition-colors hover:text-[var(--emerald-text)] focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]"
                >
                    <span aria-hidden="true">←</span>
                    Back to platform selection
                </Link>
                <h1 className="text-2xl font-semibold text-[var(--text-1)]">Admin Panel</h1>
                <p className="mb-6 text-[var(--text-3)]">Sign in to continue.</p>

                <form onSubmit={onSubmit} className="space-y-4" aria-busy={loading}>
                    <div>
                        <label htmlFor="admin-login-email" className="mb-1 block text-sm text-[var(--text-2)]">Email</label>
                        <input
                            id="admin-login-email"
                            name="email"
                            type="email"
                            required
                            disabled={loading}
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError("");
                            }}
                            placeholder="you@company.com"
                            className={`input ${
                                error
                                    ? "border-[var(--rose)]/60 focus:border-[var(--rose)] focus:ring-[var(--rose)]/40"
                                    : ""
                            }`}
                        />
                    </div>

                    <div>
                        <label htmlFor="admin-login-password" className="mb-1 block text-sm text-[var(--text-2)]">Password</label>
                        <div className="relative">
                            <input
                                id="admin-login-password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                required
                                disabled={loading}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError("");
                                }}
                                placeholder="Enter your password"
                                className={`input pr-12 ${
                                    error
                                        ? "border-[var(--rose)]/60 focus:border-[var(--rose)] focus:ring-[var(--rose)]/40"
                                        : ""
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                disabled={loading}
                                className="absolute inset-y-0 right-2 my-auto h-8 cursor-pointer rounded-[var(--radius-sm)] px-2 text-[var(--text-2)] transition hover:bg-[var(--bg-3)] hover:text-[var(--text-1)] disabled:cursor-not-allowed disabled:opacity-50"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" variant="primary" disabled={loading} className="w-full">
                        {loading ? (
                            <>
                                <svg
                                    className="h-4 w-4 animate-spin motion-reduce:animate-none"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    aria-hidden="true"
                                >
                                    <path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" />
                                </svg>
                                <span role="status" aria-live="polite">Iniciando sesión…</span>
                            </>
                        ) : (
                            "Sign in"
                        )}
                    </Button>
                </form>
            </div>
        </main>
    );
}

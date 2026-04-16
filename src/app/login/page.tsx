"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions";

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
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Login failed";
            setError(message);
            triggerErrorFeedback();
            showToast(message, "error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-6">
            {toast && (
                <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4 pointer-events-none">
                    <div
                        role="status"
                        aria-live="polite"
                        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${
                            toast.type === "error"
                                ? "border-red-400/40 bg-red-500/15 text-red-100"
                                : "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                        }`}
                    >
                        <span className="mt-0.5 text-base" aria-hidden>
                            {toast.type === "error" ? "⚠️" : "✅"}
                        </span>
                        <p className="flex-1 font-medium">{toast.message}</p>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="rounded-md px-2 py-1 text-xs text-slate-200/90 hover:bg-white/10"
                            aria-label="Dismiss notification"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            <div
                className={`w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 backdrop-blur p-8 shadow-2xl transition-all hover:border-slate-700 hover:shadow-indigo-500/10 ${
                    shakeForm ? "animate-login-shake" : ""
                }`}
                onAnimationEnd={() => setShakeForm(false)}
            >
                <h1 className="text-2xl font-semibold mb-2">Admin Panel</h1>
                <p className="text-slate-400 mb-6">Sign in to continue.</p>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (error) setError("");
                            }}
                            placeholder="you@company.com"
                            className={`input ${
                                error
                                    ? "border-red-400/60 focus:border-red-400 focus:ring-red-500/50"
                                    : ""
                            }`}
                        />
                    </div>

                    <div>
                        <label className="block text-sm mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error) setError("");
                                }}
                                placeholder="Enter your password"
                                className={`input pr-12 ${
                                    error
                                        ? "border-red-400/60 focus:border-red-400 focus:ring-red-500/50"
                                        : ""
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                className="absolute inset-y-0 right-2 my-auto h-8 rounded-md px-2 text-slate-300 transition hover:bg-slate-800 hover:text-white"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={loading}
                        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-2 font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/20 active:translate-y-0"
                    >
                        {loading ? "Signing in..." : "Sign in"}
                    </button>
                </form>
            </div>
        </main>
    );
}

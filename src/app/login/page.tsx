"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
const router = useRouter();
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function onSubmit(e: FormEvent) {
e.preventDefault(); setError(""); setLoading(true);
try { const res = await api.login(email, password); saveAuth(res.accessToken, res.user); router.push("/dashboard/users"); }
catch (err) { setError(err instanceof Error ? err.message : "Login failed"); }
finally { setLoading(false); }
}

return (
<main className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100">
<form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
<h1 className="text-2xl font-semibold">Admin Panel</h1>
<input className="input" placeholder="Email" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} />
<input className="input" placeholder="Password" type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} />
{error ? <p className="text-red-400 text-sm">{error}</p> : null}
<button className="w-full rounded-lg bg-indigo-600 py-2">{loading ? "Signing in..." : "Sign in"}</button>
</form>
</main>
);
}

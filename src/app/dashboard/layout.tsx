"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getToken, getUser } from "@/lib/auth";

type SessionUser = {
name?: string;
email?: string;
role?: string;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
const router = useRouter();
const [user, setUser] = useState<SessionUser | null>(null);

useEffect(() => {
const token = getToken();
const me = getUser<SessionUser>();

if (!token || !me) {
router.replace("/login");
return;
}

if ((me.role || "").toLowerCase() !== "admin") {
clearAuth();
router.replace("/login");
return;
}

setUser(me);
}, [router]);

function logout() {
clearAuth();
router.replace("/login");
}

return (
<div className="min-h-screen bg-slate-950 text-slate-100">
<header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-20">
<div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
<div>
<h1 className="text-lg font-semibold">Budget Admin</h1>
<p className="text-xs text-slate-400">Users Management</p>
</div>

<div className="flex items-center gap-4 text-sm">
<span className="text-slate-300">
{user?.name || user?.email} {user?.role ? `(${user.role})` : ""}
</span>
<button
onClick={logout}
className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800"
>
Logout
</button>
</div>
</div>
</header>

<div className="max-w-7xl mx-auto px-6 py-6">
<nav className="mb-6 flex gap-3 text-sm">
<Link href="/dashboard/users" className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800">
Users
</Link>
</nav>
{children}
</div>
</div>
);
}

"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, getToken } from "@/lib/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
const router = useRouter();
useEffect(() => { if (!getToken()) router.replace("/login"); }, [router]);
return (
<div className="min-h-screen bg-slate-950 text-slate-100">
<header className="border-b border-slate-800 p-4 flex justify-between">
<Link href="/dashboard/users">Users</Link>
<button onClick={()=>{clearAuth(); router.replace("/login");}}>Logout</button>
</header>
<main className="p-6">{children}</main>
</div>
);
}

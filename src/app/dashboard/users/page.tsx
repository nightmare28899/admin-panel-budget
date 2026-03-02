"use client";
import { useEffect, useState } from "react";
import { api, UserRow } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function UsersPage() {
const [users, setUsers] = useState<UserRow[]>([]);
const [err, setErr] = useState("");
useEffect(() => {
const t = getToken();
if (!t) return;
api.getUsers(t, true).then(r => setUsers(r.users || [])).catch(e => setErr(String(e)));
}, []);
return (
<section>
<h2 className="text-2xl font-semibold mb-4">Users</h2>
{err ? <p className="text-red-400">{err}</p> : null}
<div className="rounded border border-slate-800 overflow-x-auto">
<table className="w-full text-sm">
<thead className="bg-slate-900"><tr><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Status</th></tr></thead>
<tbody>{users.map(u => <tr key={u.id} className="border-t border-slate-800"><td className="p-2">{u.name}</td><td className="p-2">{u.email}</td><td className="p-2">{u.role}</td><td className="p-2">{u.isActive ? "Active":"Disabled"}</td></tr>)}</tbody>
</table>
</div>
</section>
);
}

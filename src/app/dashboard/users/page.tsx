"use client";

import { useEffect, useState } from "react";
import { api, UserRow } from "@/lib/api";
import { getToken } from "@/lib/auth";

export default function UsersPage() {
const [users, setUsers] = useState<UserRow[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
const token = getToken();
if (!token) {
setError("No auth token found. Please login again.");
setLoading(false);
return;
}

api.getUsers(token, true)
.then((res) => setUsers(Array.isArray(res.users) ? res.users : []))
.catch((e) => setError(e instanceof Error ? e.message : "Failed to load users"))
.finally(() => setLoading(false));
}, []);

return (
<section className="space-y-4">
<h2 className="text-2xl font-semibold text-white">Users</h2>
<p className="text-sm text-slate-300">Total: {users.length}</p>

{loading && <p className="text-amber-300">Loading users...</p>}
{error && <p className="text-red-400 break-all">{error}</p>}

<div className="overflow-x-auto rounded-xl border border-slate-700">
<table className="w-full text-sm text-slate-100">
<thead className="bg-slate-800">
<tr>
<th className="p-3 text-left">Avatar</th>
<th className="p-3 text-left">Name</th>
<th className="p-3 text-left">Email</th>
<th className="p-3 text-left">Role</th>
<th className="p-3 text-left">Status</th>
</tr>
</thead>
<tbody>
{!loading && users.length === 0 ? (
<tr>
<td className="p-3" colSpan={5}>No users found</td>
</tr>
) : (
users.map((u) => (
<tr key={u.id} className="border-t border-slate-800">
<td className="p-3">
{u.avatarUrl ? (
<img src={u.avatarUrl} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
) : (
<div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-xs">
{(u.name || "U").slice(0,1).toUpperCase()}
</div>
)}
</td>
<td className="p-3">{u.name}</td>
<td className="p-3">{u.email}</td>
<td className="p-3">{u.role}</td>
<td className="p-3">{u.isActive ? "Active" : "Disabled"}</td>
</tr>
))
)}
</tbody>
</table>
</div>
</section>
);
}

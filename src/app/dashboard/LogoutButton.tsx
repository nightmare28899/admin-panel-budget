"use client";

import { logoutAction } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleLogout() {
        setLoading(true);
        await logoutAction();
        router.replace("/login");
    }

    return (
        <button
            disabled={loading}
            onClick={handleLogout}
            className="cursor-pointer rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800 transition-colors duration-200 hover:text-white disabled:opacity-50"
        >
            {loading ? "Logging out..." : "Logout"}
        </button>
    );
}

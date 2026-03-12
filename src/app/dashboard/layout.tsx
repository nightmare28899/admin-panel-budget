import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LogoutButton } from "./LogoutButton";

type SessionUser = {
    name?: string;
    email?: string;
    role?: string;
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;
    const userCookie = cookieStore.get("admin_user")?.value;

    if (!token || !userCookie) {
        redirect("/login");
    }

    let user: SessionUser | null = null;
    try {
        user = JSON.parse(userCookie);
    } catch {
        redirect("/login");
    }

    if ((user?.role || "").toLowerCase() !== "admin") {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20 shadow-sm transition-colors duration-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold">Budget Admin</h1>
                        <p className="text-xs text-slate-400">Users Management</p>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-300">
                            {user?.name || user?.email} {user?.role ? `(${user.role})` : ""}
                        </span>
                        <LogoutButton />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-6">
                <nav className="mb-6 flex gap-3 text-sm">
                    <Link href="/dashboard/users" className="rounded-lg border border-slate-700 px-3 py-1.5 hover:bg-slate-800 transition-colors duration-200 hover:text-white">
                        Users
                    </Link>
                </nav>
                {children}
            </div>
        </div>
    );
}

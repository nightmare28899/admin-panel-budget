import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "./DashboardShell";

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

    return <DashboardShell user={user ?? {}}>{children}</DashboardShell>;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import { api } from "@/lib/api";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
        redirect("/login");
    }

    try {
        const profile = await api.getMe(token);
        const user = profile.user;
        if ((user?.role || "").toLowerCase() !== "admin") {
            redirect("/login");
        }

        return <DashboardShell user={user ?? {}}>{children}</DashboardShell>;
    } catch {
        redirect("/login");
    }
}

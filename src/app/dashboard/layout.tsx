import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import { getAdminMe } from "@/lib/adminMe";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
        redirect("/login");
    }

    let user;
    try {
        user = (await getAdminMe(token)).user;
    } catch {
        redirect("/login");
    }

    if ((user?.role || "").toLowerCase() !== "admin") {
        redirect("/login");
    }

    return <DashboardShell user={user ?? {}}>{children}</DashboardShell>;
}

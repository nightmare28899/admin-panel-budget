import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardShell } from "./DashboardShell";
import { getAdminMe } from "@/lib/adminMe";
import { isUnauthorizedApiError } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
        redirect("/login");
    }

    let user;
    try {
        user = (await getAdminMe(token)).user;
    } catch (error) {
        if (isUnauthorizedApiError(error)) redirect("/login");
        throw error;
    }

    if ((user?.role || "").toLowerCase() !== "admin") {
        redirect("/login");
    }

    return <DashboardShell user={user ?? {}}>{children}</DashboardShell>;
}

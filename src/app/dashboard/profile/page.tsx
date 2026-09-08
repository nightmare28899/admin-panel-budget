import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { api } from "@/lib/api";
import { ProfileView } from "./ProfileView";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const profile = await api.getMe(token);
    const user = profile.user;
    if ((user?.role || "").toLowerCase() !== "admin" || !user) {
      redirect("/login");
    }

    return <ProfileView initialUser={user} initialAccount={profile.account} />;
  } catch {
    redirect("/login");
  }
}

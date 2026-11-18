import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminMe } from "@/lib/adminMe";
import { isUnauthorizedApiError } from "@/lib/session";
import { ProfileView } from "./ProfileView";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;

  if (!token) {
    redirect("/login");
  }

  let profile;
  try {
    profile = await getAdminMe(token);
  } catch (error) {
    if (isUnauthorizedApiError(error)) redirect("/login");
    throw error;
  }

  const user = profile.user;
  if ((user?.role || "").toLowerCase() !== "admin" || !user) {
    redirect("/login");
  }

  return <ProfileView initialUser={user} initialAccount={profile.account} />;
}

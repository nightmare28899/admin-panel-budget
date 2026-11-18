import { redirect } from "next/navigation";
import { getUserToken } from "@/lib/userSession";

// Nutrition shares the Personal Finance session: sign in once at /user-login.
export default async function LoginPage() {
  if (await getUserToken()) redirect("/nutrition");
  redirect("/user-login?next=/nutrition");
}

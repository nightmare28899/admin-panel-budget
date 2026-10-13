import { z } from "zod";
import { userApi } from "@/lib/userApi";
import { getUserToken } from "@/lib/userSession";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404, headers: NO_STORE });
  const token = await getUserToken();
  if (!token) return new Response(null, { status: 401, headers: NO_STORE });
  let upstream: Response;
  try {
    upstream = await userApi.downloadNutritionFile(token, parsed.data);
  } catch {
    return new Response(null, { status: 502, headers: NO_STORE });
  }
  if (!upstream.ok || !upstream.body) {
    void upstream.body?.cancel();
    const status = upstream.status === 401 || upstream.status === 404 ? upstream.status : 502;
    return new Response(null, { status, headers: NO_STORE });
  }
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  for (const name of ["content-disposition", "content-length"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { headers });
}

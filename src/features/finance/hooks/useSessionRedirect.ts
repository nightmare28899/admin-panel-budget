import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Every server action in this feature can report `sessionExpired`. This is
 * the one place that decides what happens when it does, so callers don't
 * each re-implement the same redirect.
 */
export function useSessionRedirect() {
  const router = useRouter();

  return useCallback(
    (sessionExpired?: boolean) => {
      if (!sessionExpired) return false;
      router.push("/user-login");
      return true;
    },
    [router],
  );
}

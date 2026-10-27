"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SIGNED_IN_PATH } from "@/lib/auth/paths";

/**
 * Sends an open trainer page to the child's side when its unlock ends, so the
 * page is not left showing; the server refuses after then anyway.
 * decisions/f001-trainer-side.md
 */
export function TrainerTimeout({ expiresAt }: Readonly<{ expiresAt: string }>) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(
      () => router.replace(SIGNED_IN_PATH),
      Math.max(0, new Date(expiresAt).getTime() - Date.now())
    );
    return () => clearTimeout(timer);
  }, [expiresAt, router]);
  return null;
}

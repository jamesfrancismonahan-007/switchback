"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "./AppProvider";

/** Sends signed-out people to /login and people without a profile to /onboarding. */
export function Gate({ children, needProfile = true }: { children: ReactNode; needProfile?: boolean }) {
  const { ready, session, profile } = useApp();
  const router = useRouter();

  const blocked = !ready || !session || (needProfile && !profile);

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/login");
    else if (needProfile && !profile) router.replace("/onboarding");
  }, [ready, session, profile, needProfile, router]);

  if (blocked) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted" role="status">
        Loading…
      </div>
    );
  }
  return <>{children}</>;
}

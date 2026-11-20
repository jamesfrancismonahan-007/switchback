"use client";

import { useRouter } from "next/navigation";
import { Gate } from "@/components/Gate";
import { ProfileForm } from "@/components/ProfileForm";
import { useApp } from "@/components/AppProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { signOut } = useApp();
  return (
    <Gate needProfile={false}>
      <main className="flex flex-col gap-6 px-5 pb-10 pt-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Set up your profile</h1>
          <p className="mt-1 text-sm text-muted">This is what other hikers see before they match with you.</p>
        </div>
        <ProfileForm submitLabel="Start finding partners" onSaved={() => router.replace("/")} />
        <button onClick={() => signOut()} className="text-sm font-semibold text-muted">
          Sign out
        </button>
      </main>
    </Gate>
  );
}

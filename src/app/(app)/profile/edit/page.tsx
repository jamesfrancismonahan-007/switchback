"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileForm } from "@/components/ProfileForm";

export default function EditProfilePage() {
  const router = useRouter();
  return (
    <>
      <header className="flex h-16 items-center gap-1 pl-1 pr-4">
        <Link href="/profile" aria-label="Back to profile" className="flex h-11 w-11 items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="font-display text-[22px] font-bold">Edit profile</h1>
      </header>
      <main className="px-4 pb-8">
        <ProfileForm submitLabel="Save" onSaved={() => router.push("/profile")} />
      </main>
    </>
  );
}

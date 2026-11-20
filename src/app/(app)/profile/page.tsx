"use client";

import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { age } from "@/lib/format";
import { Avatar, Chip, LevelBadge, TopHikes } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function ProfilePage() {
  const { profile, areaById, signOut } = useApp();
  const p = profile!;

  async function deleteProfile() {
    if (!confirm("Delete your profile, matches and messages? This can't be undone.")) return;
    await supabase().from("profiles").delete().eq("id", p.id);
    await signOut();
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between pl-5 pr-4">
        <h1 className="font-display text-[22px] font-bold">Your profile</h1>
        <Link href="/profile/edit" className="flex min-h-11 items-center rounded-full border border-line-strong bg-white px-4 text-sm font-semibold">
          Edit
        </Link>
      </header>
      <main className="flex flex-col gap-3 px-4 pb-6 pt-1">
        <section className="flex flex-col gap-3.5 rounded-3xl border border-line bg-white p-5">
          <div className="flex items-center gap-3.5">
            <Avatar id={p.id} name={p.display_name} url={p.avatar_url} size={64} />
            <div className="flex flex-col">
              <span className="font-display text-[22px] font-bold">
                {p.display_name} <span className="font-sans text-base font-normal text-muted">{age(p.birthdate)}</span>
              </span>
              <span className="text-[13px] text-muted">{areaById(p.home_area)?.name}</span>
            </div>
          </div>
          {p.bio && <p className="text-sm leading-relaxed text-[#2B342E]">{p.bio}</p>}
          <div className="flex flex-wrap gap-1.5">
            {p.levels.map((l) => (
              <LevelBadge key={l} level={l} />
            ))}
            {p.availability && <Chip>{p.availability}</Chip>}
          </div>
          <TopHikes hikes={p.top_hikes} />
        </section>

        <section className="flex flex-col gap-2 rounded-[20px] border border-line bg-white px-4.5 py-4 text-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Safety</h2>
          <p className="leading-relaxed text-ink-soft">
            Before a hike, tap <strong>Plan</strong> in a chat. If you don&apos;t check in by your back-by time, your emergency
            contact gets a text with the trail and who you&apos;re with.
          </p>
          <Link href="/profile/edit" className="font-semibold text-forest">
            Update emergency contact
          </Link>
        </section>

        <button onClick={() => signOut()} className="min-h-12 rounded-2xl border border-line-strong bg-white font-semibold">
          Sign out
        </button>
        <button onClick={deleteProfile} className="min-h-11 text-sm font-semibold text-[#7A1F1F]">
          Delete my profile
        </button>
      </main>
    </>
  );
}

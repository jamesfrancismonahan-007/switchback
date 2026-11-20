"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { MatchRow } from "@/lib/types";
import { Avatar } from "@/components/ui";

export default function MatchesPage() {
  const [rows, setRows] = useState<MatchRow[] | null>(null);

  useEffect(() => {
    supabase()
      .rpc("my_matches")
      .then(({ data }) => setRows((data as MatchRow[]) ?? []));
  }, []);

  return (
    <>
      <header className="flex h-16 items-center px-5">
        <h1 className="font-display text-[22px] font-bold">Matches</h1>
      </header>
      <main className="flex flex-col gap-2 px-4 pb-4 pt-1">
        {rows === null && <div className="h-20 animate-pulse rounded-2xl bg-white" />}
        {rows?.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">
            No matches yet. Tap <strong>Hike together</strong> on people in Discover. When they tap it for you too,
            they show up here.
          </p>
        )}
        {rows?.map((m) => (
          <Link
            key={m.match_id}
            href={`/chat/${m.match_id}`}
            className="flex min-h-[72px] items-center gap-3 rounded-2xl border border-line bg-white px-3.5 py-3"
          >
            <Avatar id={m.other.id} name={m.other.display_name} url={m.other.avatar_url} size={48} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-semibold">{m.other.display_name}</span>
              <span className="truncate text-[13px] text-muted">{m.last_body ?? "New match. Say hi and pick a hike."}</span>
            </span>
          </Link>
        ))}
        <p className="mx-1 mt-2 text-xs leading-relaxed text-muted">
          You only match when you both tap Hike together. Chats stay in the app until you choose to share a number.
        </p>
      </main>
    </>
  );
}

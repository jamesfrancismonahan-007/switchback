"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LEVELS, type Level, type Profile } from "@/lib/types";
import { age, shortDate } from "@/lib/format";
import { useApp } from "@/components/AppProvider";
import { LocationSheet } from "@/components/LocationSheet";
import { Avatar, Chip, LevelBadge, Logo, MountainIcon, TopHikes } from "@/components/ui";

export default function DiscoverPage() {
  const { profile, areaById, viewArea } = useApp();
  const router = useRouter();
  const me = profile!;
  const area = areaById(viewArea);
  const traveling = viewArea !== me.home_area;

  const [levels, setLevels] = useState<Level[]>(me.levels.length ? me.levels : [...LEVELS]);
  const deckKey = `${viewArea}|${levels.join(",")}`;
  const [loaded, setLoaded] = useState<{ key: string; rows: Profile[] } | null>(null);
  const deck = loaded?.key === deckKey ? loaded.rows : null;
  const setDeck = (f: (d: Profile[] | null) => Profile[] | null) =>
    setLoaded((cur) => (cur ? { key: cur.key, rows: f(cur.rows) ?? [] } : cur));
  const [showLoc, setShowLoc] = useState(false);
  const [match, setMatch] = useState<{ id: string; who: Profile } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!viewArea) return;
    let alive = true;
    const key = `${viewArea}|${levels.join(",")}`;
    supabase()
      .rpc("discover", { p_area: viewArea, p_levels: levels })
      .then(({ data, error }) => {
        if (!alive) return;
        setError(error ? error.message : "");
        setLoaded({ key, rows: (data as Profile[]) ?? [] });
      });
    return () => {
      alive = false;
    };
  }, [viewArea, levels]);

  const cur = deck?.[0];

  async function swipe(liked: boolean) {
    if (!cur) return;
    setDeck((d) => d?.slice(1) ?? null);
    const { error } = await supabase().from("swipes").upsert({ from_id: me.id, to_id: cur.id, liked });
    if (error) return setError(error.message);
    if (liked) {
      const [a, b] = [me.id, cur.id].sort();
      const { data } = await supabase().from("matches").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
      if (data) setMatch({ id: data.id, who: cur });
    }
  }

  function toggle(l: Level) {
    setLevels((cur) => {
      const next = cur.includes(l) ? cur.filter((x) => x !== l) : [...cur, l];
      return next.length ? next : cur;
    });
  }

  const visiting = cur && cur.home_area !== viewArea;

  return (
    <>
      <header className="flex h-16 items-center justify-between pl-5 pr-4">
        <div className="flex items-center gap-2 text-forest">
          <Logo />
          <span className="font-display text-[22px] font-bold">Switchback</span>
        </div>
        <button
          onClick={() => setShowLoc(true)}
          aria-label={`Change location, currently ${area?.name ?? ""}`}
          className={`flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold ${
            traveling ? "border-[#F0C9AE] bg-clay-tint text-clay" : "border-line-strong bg-white text-ink"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {area?.short_name ?? "…"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </header>

      <main className="flex flex-col gap-3 px-4 pb-4">
        {traveling && (
          <div className="rounded-xl bg-clay-tint px-3.5 py-2.5 text-[13px] font-medium text-clay">
            Travel mode: showing hikers in {area?.name}
            {me.travel_area === viewArea && me.travel_from ? ` for ${shortDate(me.travel_from)}–${shortDate(me.travel_to!)}` : ""}.
          </div>
        )}

        <div className="flex flex-wrap gap-2" role="group" aria-label="Difficulty filter">
          {LEVELS.map((l) => {
            const on = levels.includes(l);
            return (
              <button
                key={l}
                aria-pressed={on}
                onClick={() => toggle(l)}
                className={`min-h-11 rounded-full border px-3.5 text-[13px] font-semibold ${
                  on ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-ink-soft"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-[#7A1F1F]">{error}</p>}

        {deck === null ? (
          <div className="h-[460px] animate-pulse rounded-3xl bg-white" aria-label="Loading hikers" />
        ) : cur ? (
          <>
            <article className="flex flex-col overflow-hidden rounded-3xl border border-line bg-white">
              <div className="relative flex h-[220px] items-center justify-center bg-forest-tint">
                {cur.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cur.avatar_url} alt={`Photo of ${cur.display_name}`} className="h-full w-full object-cover" />
                ) : (
                  <Avatar id={cur.id} name={cur.display_name} size={220} className="!h-full !w-full !rounded-none" />
                )}
                <span className="absolute right-3.5 top-3.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-semibold text-white">
                  {deck.length} {deck.length === 1 ? "hiker" : "hikers"} here
                </span>
                {visiting && (
                  <span className="absolute left-3.5 top-3.5 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-clay">
                    Visiting {shortDate(cur.travel_from!)}–{shortDate(cur.travel_to!)}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-3 px-4.5 pb-4.5 pt-4">
                <div className="flex items-baseline gap-2">
                  <h1 className="font-display text-2xl font-bold">{cur.display_name}</h1>
                  <span className="text-base text-muted">{age(cur.birthdate)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {cur.levels.map((l) => (
                    <LevelBadge key={l} level={l} />
                  ))}
                  {cur.availability && <Chip>{cur.availability}</Chip>}
                </div>
                {cur.bio && <p className="text-sm leading-relaxed text-[#2B342E]">{cur.bio}</p>}
                <TopHikes hikes={cur.top_hikes} />
              </div>
            </article>
            <div className="flex gap-2.5">
              <button
                onClick={() => swipe(false)}
                className="flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-line-strong bg-white font-semibold"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                Pass
              </button>
              <button
                onClick={() => swipe(true)}
                className="flex min-h-14 flex-[2] items-center justify-center gap-2 rounded-2xl bg-forest font-semibold text-white hover:bg-forest-dark"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12.5l4.5 4.5L19 7" />
                </svg>
                Hike together
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-white px-6 py-10 text-center">
            <MountainIcon size={48} className="text-forest" />
            <h1 className="font-display text-xl font-bold">That&apos;s everyone for now</h1>
            <p className="text-sm leading-relaxed text-muted">
              You&apos;ve seen every hiker in {area?.name} who matches your filters. New people join all the time. Check
              out group trips, widen your filters, or switch locations.
            </p>
            <div className="mt-1 flex gap-2">
              <Link href="/trips" className="flex min-h-11 items-center rounded-full bg-forest px-4 text-sm font-semibold text-white">
                See trips
              </Link>
              <button onClick={() => setShowLoc(true)} className="min-h-11 rounded-full border border-line-strong bg-white px-4 text-sm font-semibold">
                Switch location
              </button>
            </div>
          </div>
        )}
      </main>

      {showLoc && <LocationSheet onClose={() => setShowLoc(false)} />}

      {match && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-forest px-8 text-center text-white" role="dialog" aria-modal="true" aria-label="It's a match">
          <MountainIcon size={56} />
          <h2 className="font-display text-4xl font-bold leading-tight">It&apos;s a match</h2>
          <p className="text-base leading-relaxed text-[#D7E6DC]">
            You and {match.who.display_name} both want to hike together.
            {match.who.top_hikes[0] ? ` ${match.who.display_name.split(" ")[0]}'s top pick is ${match.who.top_hikes[0]}.` : ""}
          </p>
          <div className="mt-3 flex w-full max-w-[360px] flex-col gap-2.5">
            <button onClick={() => router.push(`/chat/${match.id}`)} className="min-h-13 rounded-2xl bg-white font-bold text-forest">
              Send a message
            </button>
            <button onClick={() => setMatch(null)} className="min-h-13 rounded-2xl border border-white/60 font-semibold">
              Keep browsing
            </button>
          </div>
        </div>
      )}
    </>
  );
}

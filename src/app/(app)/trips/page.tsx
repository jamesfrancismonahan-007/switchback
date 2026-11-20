"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LEVELS, type Level, type TripRow } from "@/lib/types";
import { dateTime, toLocalInput } from "@/lib/format";
import { useApp } from "@/components/AppProvider";
import { ErrorText, Field, inputCls, LevelBadge, primaryBtn, Sheet } from "@/components/ui";

type Req = { user_id: string; status: "pending" | "accepted" | "declined"; profiles: { display_name: string } | null };

export default function TripsPage() {
  const { profile, viewArea, areaById } = useApp();
  const me = profile!;
  const area = areaById(viewArea);
  const [loaded, setLoaded] = useState<{ area: string; rows: TripRow[] } | null>(null);
  const trips = loaded?.area === viewArea ? loaded.rows : null;
  const [tick, setTick] = useState(0);
  const load = () => setTick((t) => t + 1);
  const [posting, setPosting] = useState(false);
  const [managing, setManaging] = useState<TripRow | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!viewArea) return;
    let alive = true;
    supabase()
      .rpc("trips_in_area", { p_area: viewArea })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setError(error.message);
        setLoaded({ area: viewArea, rows: (data as TripRow[]) ?? [] });
      });
    return () => {
      alive = false;
    };
  }, [viewArea, tick]);

  async function toggleJoin(t: TripRow) {
    setError("");
    const q = supabase().from("trip_requests");
    const { error } = t.my_status
      ? await q.delete().eq("trip_id", t.id).eq("user_id", me.id)
      : await q.insert({ trip_id: t.id, user_id: me.id });
    if (error) setError(error.message);
    load();
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between pl-5 pr-4">
        <div className="flex flex-col">
          <h1 className="font-display text-[22px] font-bold">Trips</h1>
          <span className="text-xs text-muted">Group hikes in {area?.name}</span>
        </div>
        <button onClick={() => setPosting(true)} className="flex min-h-11 items-center gap-1.5 rounded-full bg-forest px-4 text-sm font-semibold text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Post a trip
        </button>
      </header>

      <main className="flex flex-col gap-3 px-4 pb-4 pt-1">
        <ErrorText>{error}</ErrorText>
        {trips === null && <div className="h-40 animate-pulse rounded-3xl bg-white" />}
        {trips?.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted">No trips posted in {area?.name} yet. Be the first.</p>
        )}
        {trips?.map((t) => {
          const mine = t.host_id === me.id;
          const left = Math.max(0, t.spots - t.accepted);
          let label = "Ask to join";
          if (mine) label = t.pending ? `Your trip · ${t.pending} ${t.pending === 1 ? "request" : "requests"} to review` : "Your trip · manage";
          else if (t.my_status === "pending") label = `Requested · ${t.host_name.split(" ")[0]} will confirm`;
          else if (t.my_status === "accepted") label = "You're going ✓";
          else if (t.my_status === "declined") label = "Not this time";
          else if (left === 0) label = "Full";
          const quiet = mine || !!t.my_status || left === 0;
          return (
            <article key={t.id} className="flex flex-col gap-2.5 rounded-[20px] border border-line bg-white p-4">
              <div className="flex items-start justify-between gap-2.5">
                <h2 className="font-display text-lg font-bold leading-tight">{t.trail}</h2>
                <LevelBadge level={t.level} />
              </div>
              <div className="flex flex-col gap-1 text-[13px] text-ink-soft">
                <span>📅 {dateTime(t.starts_at)}</span>
                <span>
                  👤 Hosted by {mine ? "you" : t.host_name} · {left} {left === 1 ? "spot" : "spots"} left
                </span>
              </div>
              {t.note && <p className="rounded-xl bg-clay-tint px-3 py-2 text-xs font-medium leading-snug text-clay">{t.note}</p>}
              <button
                onClick={() => {
                  if (mine) return setManaging(t);
                  if (t.my_status === "declined" || (left === 0 && !t.my_status)) return;
                  if (t.my_status === "accepted" && !confirm("Drop out of this trip?")) return;
                  void toggleJoin(t);
                }}
                className={`min-h-11 rounded-xl text-sm font-semibold ${quiet ? "bg-forest-tint text-forest" : "bg-forest text-white"}`}
              >
                {label}
              </button>
              {(t.my_status === "pending" || t.my_status === "accepted") && (
                <span className="text-center text-xs text-muted">
                  {t.my_status === "pending" ? "Tap again to cancel your request." : "Tap to drop out."}
                </span>
              )}
            </article>
          );
        })}
      </main>

      {posting && (
        <PostTrip
          onClose={() => setPosting(false)}
          onPosted={() => {
            setPosting(false);
            load();
          }}
        />
      )}
      {managing && (
        <ManageTrip
          trip={managing}
          onClose={() => {
            setManaging(null);
            load();
          }}
        />
      )}
    </>
  );
}

function PostTrip({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const { profile, viewArea, areaById } = useApp();
  const [trail, setTrail] = useState("");
  const [when, setWhen] = useState("");
  const [level, setLevel] = useState<Level>("Moderate");
  const [spots, setSpots] = useState(3);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trail.trim() || !when) return setError("Add the trail and when you're starting.");
    setBusy(true);
    const { error } = await supabase().from("trips").insert({
      host_id: profile!.id,
      area_id: viewArea,
      trail: trail.trim(),
      starts_at: new Date(when).toISOString(),
      level,
      spots,
      note: note.trim(),
    });
    setBusy(false);
    if (error) setError(error.message);
    else onPosted();
  }

  return (
    <Sheet title="Post a trip" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <Field label="Trail" htmlFor="ptrail">
          <input id="ptrail" maxLength={120} value={trail} onChange={(e) => setTrail(e.target.value)} placeholder="e.g. Tahquitz Peak via Devil's Slide" className={inputCls} />
        </Field>
        <Field label="Start time" htmlFor="pwhen">
          <input id="pwhen" type="datetime-local" min={toLocalInput(new Date())} value={when} onChange={(e) => setWhen(e.target.value)} className={inputCls} />
        </Field>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Difficulty</legend>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={level === l}
                onClick={() => setLevel(l)}
                className={`min-h-11 rounded-full border px-3.5 text-[13px] font-semibold ${
                  level === l ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-ink-soft"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <Field label="Spots for other people" htmlFor="pspots">
          <input id="pspots" type="number" min={1} max={20} value={spots} onChange={(e) => setSpots(Number(e.target.value) || 1)} className={inputCls} />
        </Field>
        <Field label="Note (optional)" htmlFor="pnote" hint="Experience needed, gear, permits, where to meet.">
          <input id="pnote" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
        </Field>
        <ErrorText>{error}</ErrorText>
        <button type="submit" disabled={busy || !trail.trim()} className={primaryBtn}>
          {busy ? "Posting…" : `Post to ${areaById(viewArea)?.short_name ?? ""}`}
        </button>
      </form>
    </Sheet>
  );
}

function ManageTrip({ trip, onClose }: { trip: TripRow; onClose: () => void }) {
  const [reqs, setReqs] = useState<Req[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    supabase()
      .from("trip_requests")
      .select("user_id, status, profiles(display_name)")
      .eq("trip_id", trip.id)
      .order("created_at")
      .then(({ data }) => alive && setReqs((data as unknown as Req[]) ?? []));
    return () => {
      alive = false;
    };
  }, [trip.id, tick]);

  async function decide(userId: string, status: "accepted" | "declined") {
    await supabase().from("trip_requests").update({ status }).eq("trip_id", trip.id).eq("user_id", userId);
    setTick((t) => t + 1);
  }

  async function cancelTrip() {
    if (!confirm("Cancel this trip? Everyone who asked to join will lose it.")) return;
    await supabase().from("trips").delete().eq("id", trip.id);
    onClose();
  }

  const accepted = reqs?.filter((r) => r.status === "accepted").length ?? 0;

  return (
    <Sheet title={trip.trail} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <p className="px-1 text-sm text-muted">
          {dateTime(trip.starts_at)} · {accepted} of {trip.spots} spots filled
        </p>
        {reqs?.length === 0 && <p className="px-1 py-4 text-sm text-muted">No requests yet.</p>}
        {reqs?.map((r) => (
          <div key={r.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-line px-4 py-3">
            <span className="font-semibold">{r.profiles?.display_name ?? "Hiker"}</span>
            {r.status === "pending" ? (
              <div className="flex gap-2">
                <button onClick={() => decide(r.user_id, "declined")} className="min-h-10 rounded-full border border-line-strong px-3 text-sm font-semibold">
                  Decline
                </button>
                <button
                  onClick={() => decide(r.user_id, "accepted")}
                  disabled={accepted >= trip.spots}
                  className="min-h-10 rounded-full bg-forest px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            ) : (
              <span className={`text-sm font-semibold ${r.status === "accepted" ? "text-forest" : "text-muted"}`}>
                {r.status === "accepted" ? "Going" : "Declined"}
              </span>
            )}
          </div>
        ))}
        <button onClick={cancelTrip} className="mt-2 self-start px-1 text-sm font-semibold text-[#7A1F1F]">
          Cancel trip
        </button>
      </div>
    </Sheet>
  );
}

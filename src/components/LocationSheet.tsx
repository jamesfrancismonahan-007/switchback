"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { shortDate } from "@/lib/format";
import { useApp } from "./AppProvider";
import { ErrorText, Field, inputCls, primaryBtn, Sheet } from "./ui";

export function LocationSheet({ onClose }: { onClose: () => void }) {
  const { profile, areas, areaById, viewArea, setViewArea, refreshProfile } = useApp();
  const p = profile!;
  const [adding, setAdding] = useState(false);
  const [tArea, setTArea] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const trip = p.travel_area && p.travel_to && p.travel_to >= today ? p : null;

  function pick(id: string) {
    setViewArea(id);
    onClose();
  }

  async function saveTrip(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!tArea || !from || !to) return setError("Pick a place and your dates.");
    if (to < from) return setError("Your last day is before your first day.");
    setBusy(true);
    const { error } = await supabase()
      .from("profiles")
      .update({ travel_area: tArea, travel_from: from, travel_to: to })
      .eq("id", p.id);
    setBusy(false);
    if (error) return setError(error.message);
    await refreshProfile();
    pick(tArea);
  }

  async function clearTrip() {
    await supabase().from("profiles").update({ travel_area: null, travel_from: null, travel_to: null }).eq("id", p.id);
    await refreshProfile();
    setViewArea(p.home_area);
  }

  const row = (id: string, sub: string) => {
    const sel = viewArea === id;
    return (
      <button
        key={id}
        onClick={() => pick(id)}
        className={`flex min-h-15 items-center justify-between gap-3 rounded-2xl border px-4 py-2.5 text-left ${sel ? "border-forest bg-forest-tint" : "border-line bg-white"}`}
      >
        <span className="flex flex-col">
          <span className="font-semibold">{areaById(id)?.name}</span>
          <span className="text-xs text-muted">{sub}</span>
        </span>
        {sel && (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F4D3A" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        )}
      </button>
    );
  };

  return (
    <Sheet title="Where are you hiking?" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <p className="px-1 pb-1 text-sm text-muted">
          Going somewhere? Add a trip and you&apos;ll see hikers who live there, and they&apos;ll see you&apos;re visiting.
        </p>
        {row(p.home_area, "Home")}
        {trip && row(trip.travel_area!, `Traveling ${shortDate(trip.travel_from!)}–${shortDate(trip.travel_to!)}`)}
        {trip && (
          <button onClick={clearTrip} className="self-start px-1 text-sm font-semibold text-muted">
            Remove trip
          </button>
        )}

        {!adding ? (
          <button onClick={() => setAdding(true)} className="mt-1 min-h-12 rounded-2xl border border-dashed border-line-strong text-sm font-semibold text-forest">
            {trip ? "Change trip" : "+ Add an upcoming trip"}
          </button>
        ) : (
          <form onSubmit={saveTrip} className="mt-2 flex flex-col gap-3 rounded-2xl border border-line bg-sand p-4">
            <Field label="Where" htmlFor="tarea">
              <select id="tarea" value={tArea} onChange={(e) => setTArea(e.target.value)} className={inputCls}>
                <option value="">Choose an area</option>
                {areas
                  .filter((a) => a.id !== p.home_area)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" htmlFor="tfrom">
                <input id="tfrom" type="date" min={today} value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              </Field>
              <Field label="To" htmlFor="tto">
                <input id="tto" type="date" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              </Field>
            </div>
            <ErrorText>{error}</ErrorText>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {busy ? "Saving…" : "Save trip"}
            </button>
          </form>
        )}
      </div>
    </Sheet>
  );
}

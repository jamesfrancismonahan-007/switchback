"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { HikePlan } from "@/lib/types";
import { timeOnly } from "@/lib/format";
import { useApp } from "./AppProvider";
import { ShieldIcon } from "./ui";

export const PLANS_CHANGED = "switchback:plans-changed";

/** Shows any hike plan you haven't checked in from yet, with an "I'm back safe" button. */
export function ActivePlanBanner() {
  const { session } = useApp();
  const [plans, setPlans] = useState<HikePlan[]>([]);
  const [tick, setTick] = useState(0);
  const uid = session?.user.id;

  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    window.addEventListener(PLANS_CHANGED, onChange);
    // Re-check every minute so "overdue" shows up without a reload.
    const timer = setInterval(onChange, 60_000);
    return () => {
      window.removeEventListener(PLANS_CHANGED, onChange);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    supabase()
      .from("hike_plans")
      .select("*")
      .eq("user_id", uid)
      .is("checked_in_at", null)
      .order("back_by")
      .then(({ data }) => alive && setPlans((data as HikePlan[]) ?? []));
    return () => {
      alive = false;
    };
  }, [uid, tick]);

  async function checkIn(id: string) {
    await supabase().from("hike_plans").update({ checked_in_at: new Date().toISOString() }).eq("id", id);
    setTick((t) => t + 1);
  }

  if (!plans.length) return null;
  return (
    <div className="flex flex-col gap-2 px-4 pt-3">
      {plans.map((p) => {
        const overdue = new Date(p.back_by) < new Date();
        return (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${overdue ? "bg-[#F6DADA] text-[#7A1F1F]" : "bg-forest-tint text-forest"}`}
          >
            <ShieldIcon size={20} className="shrink-0" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="truncate font-semibold">{p.trail}</div>
              <div className="text-xs">
                {p.alert_sent_at
                  ? `${p.contact_name} was alerted. Check in to let them know you're OK.`
                  : overdue
                    ? `You were due back at ${timeOnly(p.back_by)}. ${p.contact_name} gets a text soon.`
                    : `Back by ${timeOnly(p.back_by)} · ${p.contact_name} is watching`}
              </div>
            </div>
            <button onClick={() => checkIn(p.id)} className="min-h-10 shrink-0 rounded-full bg-forest px-3.5 text-xs font-bold text-white">
              I&apos;m back safe
            </button>
          </div>
        );
      })}
    </div>
  );
}

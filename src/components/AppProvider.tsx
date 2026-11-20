"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Area, Profile } from "@/lib/types";

type Ctx = {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  areas: Area[];
  areaById: (id: string | null | undefined) => Area | undefined;
  /** The area being browsed in Discover/Trips (home, or a place you're traveling to) */
  viewArea: string | null;
  setViewArea: (id: string) => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp must be used inside <AppProvider>");
  return c;
}

const VIEW_AREA_KEY = "switchback.viewArea";

export function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [ready, setReady] = useState(false);
  const [viewArea, setViewAreaState] = useState<string | null>(null);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    const { data } = await supabase().from("profiles").select("*").eq("id", s.user.id).maybeSingle();
    setProfile((data as Profile) ?? null);
    if (data) {
      const saved = typeof window !== "undefined" ? localStorage.getItem(VIEW_AREA_KEY) : null;
      setViewAreaState(saved ?? (data as Profile).home_area);
    }
  }, []);

  useEffect(() => {
    const sb = supabase();
    let cancelled = false;

    (async () => {
      const [{ data: sess }, { data: areaRows }] = await Promise.all([
        sb.auth.getSession(),
        sb.from("areas").select("*").order("name"),
      ]);
      if (cancelled) return;
      setAreas((areaRows as Area[]) ?? []);
      setSession(sess.session);
      await loadProfile(sess.session);
      if (!cancelled) setReady(true);
    })();

    const { data: sub } = sb.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        // Defer so we don't call Supabase inside its own callback.
        setTimeout(() => void loadProfile(s), 0);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const setViewArea = useCallback((id: string) => {
    setViewAreaState(id);
    localStorage.setItem(VIEW_AREA_KEY, id);
  }, []);

  const areaById = useCallback((id: string | null | undefined) => areas.find((a) => a.id === id), [areas]);

  const value: Ctx = {
    ready,
    session,
    profile,
    areas,
    areaById,
    viewArea,
    setViewArea,
    refreshProfile: () => loadProfile(session),
    signOut: async () => {
      localStorage.removeItem(VIEW_AREA_KEY);
      await supabase().auth.signOut();
    },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

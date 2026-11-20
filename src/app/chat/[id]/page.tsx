"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Message, Profile } from "@/lib/types";
import { age, timeOnly, toE164, toLocalInput } from "@/lib/format";
import { Gate } from "@/components/Gate";
import { useApp } from "@/components/AppProvider";
import { PLANS_CHANGED } from "@/components/ActivePlanBanner";
import { Avatar, Chip, ErrorText, Field, inputCls, LevelBadge, primaryBtn, Sheet, ShieldIcon, TopHikes } from "@/components/ui";

export default function ChatPage() {
  return (
    <Gate>
      <Chat />
    </Gate>
  );
}

function Chat() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useApp();
  const me = profile!;
  const router = useRouter();
  const [other, setOther] = useState<Profile | null>(null);
  const [missing, setMissing] = useState(false);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sheet, setSheet] = useState<null | "plan" | "menu" | "profile" | "report">(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sb = supabase();
    let alive = true;
    (async () => {
      const { data: m } = await sb.from("matches").select("*").eq("id", id).maybeSingle();
      if (!m) return alive && setMissing(true);
      const otherId = m.user_a === me.id ? m.user_b : m.user_a;
      const [{ data: p }, { data: list }] = await Promise.all([
        sb.from("profiles").select("*").eq("id", otherId).maybeSingle(),
        sb.from("messages").select("*").eq("match_id", id).order("created_at"),
      ]);
      if (!alive) return;
      setOther(p as Profile);
      setMsgs((list as Message[]) ?? []);
    })();

    const channel = sb
      .channel(`chat:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${id}` }, (payload) => {
        const msg = payload.new as Message;
        setMsgs((cur) => (cur.some((x) => x.id === msg.id) ? cur : [...cur, msg]));
      })
      .subscribe();

    return () => {
      alive = false;
      void sb.removeChannel(channel);
    };
  }, [id, me.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs.length]);

  const post = useCallback(
    async (body: string, kind: "text" | "system" = "text") => {
      const { data, error } = await supabase()
        .from("messages")
        .insert({ match_id: id, sender_id: me.id, body, kind })
        .select()
        .single();
      if (!error && data) setMsgs((cur) => (cur.some((x) => x.id === data.id) ? cur : [...cur, data as Message]));
      return error;
    },
    [id, me.id],
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const err = await post(text);
    if (err) setDraft(text);
  }

  async function unmatch() {
    if (!confirm(`Unmatch with ${other?.display_name}? Your chat will be deleted.`)) return;
    await supabase().from("matches").delete().eq("id", id);
    router.replace("/matches");
  }

  async function block() {
    if (!other || !confirm(`Block ${other.display_name}? You won't see each other anywhere in Switchback.`)) return;
    await supabase().from("blocks").insert({ blocker_id: me.id, blocked_id: other.id });
    router.replace("/matches");
  }

  if (missing) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-muted">This match no longer exists.</p>
        <Link href="/matches" className="font-semibold text-forest">
          Back to matches
        </Link>
      </main>
    );
  }

  const first = other?.display_name.split(" ")[0] ?? "";

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-line bg-white pl-1 pr-2">
        <Link href="/matches" aria-label="Back to matches" className="flex h-11 w-11 items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        {other && (
          <button onClick={() => setSheet("profile")} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <Avatar id={other.id} name={other.display_name} url={other.avatar_url} size={36} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{other.display_name}</span>
              <span className="truncate text-xs text-muted">{other.levels.join(" · ")}</span>
            </span>
          </button>
        )}
        <button
          onClick={() => setSheet("plan")}
          className="flex min-h-10 items-center gap-1.5 rounded-full border border-forest bg-white px-3 text-[13px] font-semibold text-forest"
        >
          <ShieldIcon />
          Plan
        </button>
        <button onClick={() => setSheet("menu")} aria-label="More options" className="flex h-11 w-9 items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </header>

      <main className="flex flex-1 flex-col gap-2 overflow-y-auto p-4" aria-live="polite">
        {other?.top_hikes[0] && (
          <div className="self-center rounded-full bg-forest-tint px-3 py-1.5 text-xs font-semibold text-forest">
            You matched · {other.top_hikes[0]} is on {first}&apos;s list
          </div>
        )}
        {msgs.map((m) =>
          m.kind === "system" ? (
            <div key={m.id} className="self-center rounded-full bg-forest-tint px-3 py-1.5 text-xs font-semibold text-forest">
              {m.body}
            </div>
          ) : (
            <div
              key={m.id}
              className={`max-w-[78%] rounded-[18px] border px-3.5 py-2.5 text-sm leading-snug ${
                m.sender_id === me.id ? "self-end border-forest bg-forest text-white" : "self-start border-line bg-white"
              }`}
            >
              {m.body}
              <span className={`mt-0.5 block text-[10px] ${m.sender_id === me.id ? "text-white/70" : "text-muted"}`}>
                {timeOnly(m.created_at)}
              </span>
            </div>
          ),
        )}
        <div ref={bottom} />
      </main>

      <form onSubmit={send} className="flex shrink-0 gap-2 border-t border-line bg-white px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5">
        <label htmlFor="chatmsg" className="sr-only">
          Message
        </label>
        <input
          id="chatmsg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder={`Message ${first}…`}
          autoComplete="off"
          className="min-h-11 flex-1 rounded-full border border-line-strong bg-sand px-3.5 text-sm"
        />
        <button type="submit" aria-label="Send" className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-white">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12l16-8-6 16-2.5-6.5z" />
          </svg>
        </button>
      </form>

      {sheet === "plan" && other && (
        <PlanSheet
          other={other}
          matchId={id}
          onClose={() => setSheet(null)}
          onShared={(backBy) => void post(`Hike plan shared · back by ${timeOnly(backBy)}`, "system")}
        />
      )}
      {sheet === "profile" && other && (
        <Sheet title={other.display_name} onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Avatar id={other.id} name={other.display_name} url={other.avatar_url} size={64} />
              <span className="text-muted">{age(other.birthdate)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {other.levels.map((l) => (
                <LevelBadge key={l} level={l} />
              ))}
              {other.availability && <Chip>{other.availability}</Chip>}
            </div>
            {other.bio && <p className="text-sm leading-relaxed">{other.bio}</p>}
            <TopHikes hikes={other.top_hikes} />
          </div>
        </Sheet>
      )}
      {sheet === "menu" && other && (
        <Sheet title="Options" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-2">
            <button onClick={() => setSheet("report")} className="min-h-12 rounded-2xl border border-line px-4 text-left font-semibold">
              Report {first}
            </button>
            <button onClick={unmatch} className="min-h-12 rounded-2xl border border-line px-4 text-left font-semibold">
              Unmatch
            </button>
            <button onClick={block} className="min-h-12 rounded-2xl border border-line px-4 text-left font-semibold text-[#7A1F1F]">
              Block {first}
            </button>
          </div>
        </Sheet>
      )}
      {sheet === "report" && other && <ReportSheet other={other} onClose={() => setSheet(null)} onBlock={block} />}
    </div>
  );
}

function ReportSheet({ other, onClose, onBlock }: { other: Profile; onClose: () => void; onBlock: () => void }) {
  const { profile } = useApp();
  const [reason, setReason] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase().from("reports").insert({ reporter_id: profile!.id, reported_id: other.id, reason: reason.trim() });
    if (error) setError(error.message);
    else setDone(true);
  }

  return (
    <Sheet title={`Report ${other.display_name}`} onClose={onClose}>
      {done ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">Thanks. We review every report. If you feel unsafe, block them too. If you&apos;re in danger, call 911.</p>
          <button onClick={onBlock} className={primaryBtn}>
            Block {other.display_name.split(" ")[0]}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <Field label="What happened?" htmlFor="reason">
            <textarea id="reason" rows={4} required maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} py-3`} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={!reason.trim()} className={primaryBtn}>
            Send report
          </button>
        </form>
      )}
    </Sheet>
  );
}

function PlanSheet({
  other,
  matchId,
  onClose,
  onShared,
}: {
  other: Profile;
  matchId: string;
  onClose: () => void;
  onShared: (backBy: string) => void;
}) {
  const { profile } = useApp();
  const [trail, setTrail] = useState(other.top_hikes[0] ?? "");
  const [backBy, setBackBy] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 6, 0, 0, 0);
    return toLocalInput(d);
  });
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [shared, setShared] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase()
      .from("profile_private")
      .select("*")
      .eq("id", profile!.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setCName((v) => v || data.emergency_name);
          setCPhone((v) => v || data.emergency_phone);
        }
      });
  }, [profile]);

  async function share(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const phone = toE164(cPhone);
    if (!trail.trim()) return setError("Which trail are you doing?");
    if (!cName.trim()) return setError("Add your emergency contact's name.");
    if (!phone) return setError("That phone number doesn't look right.");
    const back = new Date(backBy);
    if (!(back > new Date())) return setError("Your back-by time needs to be in the future.");
    setBusy(true);
    const { error } = await supabase().from("hike_plans").insert({
      user_id: profile!.id,
      match_id: matchId,
      trail: trail.trim(),
      partner_name: other.display_name,
      back_by: back.toISOString(),
      contact_name: cName.trim(),
      contact_phone: phone,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setShared(back.toISOString());
    onShared(back.toISOString());
    window.dispatchEvent(new Event(PLANS_CHANGED));
  }

  return (
    <Sheet title="Share your hike plan" onClose={onClose} icon={<ShieldIcon size={22} className="text-forest" />}>
      {shared ? (
        <div className="flex flex-col items-center gap-2.5 px-2 pb-1 pt-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-tint text-2xl text-forest">✓</span>
          <h3 className="font-display text-lg font-bold">Plan saved</h3>
          <p className="text-sm leading-relaxed text-ink-soft">
            If you haven&apos;t tapped <strong>I&apos;m back safe</strong> by {timeOnly(shared)}, {cName} gets a text saying
            you&apos;re on {trail} with {other.display_name}.
          </p>
          <button onClick={onClose} className="mt-2 min-h-12 w-full rounded-2xl border border-line-strong font-semibold">
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={share} className="flex flex-col gap-3.5">
          <p className="px-1 text-sm leading-relaxed text-muted">
            Someone you trust gets a text if you don&apos;t check in by your back-by time, with the trail and who you&apos;re with.
          </p>
          <Field label="Trail" htmlFor="strail">
            <input id="strail" maxLength={120} value={trail} onChange={(e) => setTrail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Back by" htmlFor="sback">
            <input id="sback" type="datetime-local" value={backBy} onChange={(e) => setBackBy(e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact's name" htmlFor="scname">
              <input id="scname" maxLength={60} value={cName} onChange={(e) => setCName(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Their mobile" htmlFor="scphone">
              <input id="scphone" type="tel" value={cPhone} onChange={(e) => setCPhone(e.target.value)} placeholder="(760) 555-0100" className={inputCls} />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? "Saving…" : "Share plan"}
          </button>
        </form>
      )}
    </Sheet>
  );
}

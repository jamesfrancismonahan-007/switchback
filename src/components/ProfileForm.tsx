"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { LEVELS, type Level, type Profile } from "@/lib/types";
import { toE164 } from "@/lib/format";
import { useApp } from "./AppProvider";
import { Avatar, ErrorText, Field, inputCls, primaryBtn } from "./ui";

export function ProfileForm({ onSaved, submitLabel }: { onSaved: () => void; submitLabel: string }) {
  const { session, profile, areas, refreshProfile } = useApp();
  const uid = session!.user.id;

  const [name, setName] = useState(profile?.display_name ?? "");
  const [birthdate, setBirthdate] = useState(profile?.birthdate ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [levels, setLevels] = useState<Level[]>(profile?.levels ?? []);
  const [availability, setAvailability] = useState(profile?.availability ?? "");
  const [hikes, setHikes] = useState<string[]>(() => {
    const h = profile?.top_hikes ?? [];
    return [h[0] ?? "", h[1] ?? "", h[2] ?? ""];
  });
  const [homeArea, setHomeArea] = useState(profile?.home_area ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [ecName, setEcName] = useState("");
  const [ecPhone, setEcPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase()
      .from("profile_private")
      .select("*")
      .eq("id", uid)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEcName(data.emergency_name);
          setEcPhone(data.emergency_phone);
        }
      });
  }, [uid]);

  function toggleLevel(l: Level) {
    setLevels((cur) => (cur.includes(l) ? cur.filter((x) => x !== l) : LEVELS.filter((x) => x === l || cur.includes(x))));
  }

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError("");
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${uid}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase().storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    setUploading(false);
    if (error) return setError("Photo upload failed: " + error.message);
    setAvatarUrl(supabase().storage.from("avatars").getPublicUrl(path).data.publicUrl);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!levels.length) return setError("Pick at least one difficulty you're up for.");
    if (!homeArea) return setError("Pick where you live.");
    let phone = "";
    if (ecPhone.trim()) {
      const p = toE164(ecPhone);
      if (!p) return setError("Emergency contact phone doesn't look like a valid number.");
      phone = p;
    }
    setBusy(true);
    const row: Partial<Profile> & { id: string } = {
      id: uid,
      display_name: name.trim(),
      birthdate,
      bio: bio.trim(),
      levels,
      availability: availability.trim(),
      top_hikes: hikes.map((h) => h.trim()).filter(Boolean),
      home_area: homeArea,
      avatar_url: avatarUrl,
    };
    const { error: pErr } = await supabase().from("profiles").upsert(row);
    if (pErr) {
      setBusy(false);
      return setError(pErr.message.includes("18 or older") ? "You must be 18 or older to use Switchback." : pErr.message);
    }
    const { error: privErr } = await supabase()
      .from("profile_private")
      .upsert({ id: uid, emergency_name: ecName.trim(), emergency_phone: phone });
    setBusy(false);
    if (privErr) return setError(privErr.message);
    await refreshProfile();
    onSaved();
  }

  const maxBirth = new Date();
  maxBirth.setFullYear(maxBirth.getFullYear() - 18);

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <Avatar id={uid} name={name || "?"} url={avatarUrl} size={72} />
        <label className="cursor-pointer rounded-full border border-line-strong bg-white px-4 py-2.5 text-sm font-semibold hover:bg-chip">
          {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Add a photo"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
          />
        </label>
      </div>

      <Field label="First name and last initial" htmlFor="name">
        <input id="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="James M." className={inputCls} />
      </Field>

      <Field label="Birthday" htmlFor="bday" hint="Only your age is shown. You must be 18 or older.">
        <input
          id="bday"
          type="date"
          required
          max={maxBirth.toISOString().slice(0, 10)}
          value={birthdate}
          onChange={(e) => setBirthdate(e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Where you live" htmlFor="home">
        <select id="home" required value={homeArea} onChange={(e) => setHomeArea(e.target.value)} className={inputCls}>
          <option value="">Choose an area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Difficulty you&apos;re up for</legend>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => {
            const on = levels.includes(l);
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLevel(l)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${
                  on ? "border-forest bg-forest text-white" : "border-line-strong bg-white text-ink-soft"
                }`}
              >
                {l}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Field label="When you're usually free" htmlFor="avail">
        <input id="avail" maxLength={60} value={availability} onChange={(e) => setAvailability(e.target.value)} placeholder="Weekends, pre-dawn starts" className={inputCls} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-semibold">Your top 3 hikes you want to do</legend>
        {hikes.map((h, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest-tint text-xs font-bold text-forest">{i + 1}</span>
            <input
              aria-label={`Hike ${i + 1}`}
              maxLength={80}
              value={h}
              onChange={(e) => setHikes((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
              placeholder={["Cactus to Clouds", "San Gorgonio via Vivian Creek", "Tahquitz Peak"][i]}
              className={inputCls}
            />
          </div>
        ))}
      </fieldset>

      <Field label="About you" htmlFor="bio">
        <textarea
          id="bio"
          rows={4}
          maxLength={500}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Pace, experience, what kind of hikes you love…"
          className={`${inputCls} py-3`}
        />
      </Field>

      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4">
        <div>
          <h2 className="text-sm font-semibold">Emergency contact</h2>
          <p className="text-xs text-muted">Private. Only used for hike plans you share. Nobody else can see it.</p>
        </div>
        <Field label="Name" htmlFor="ecname">
          <input id="ecname" maxLength={60} value={ecName} onChange={(e) => setEcName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Mobile number" htmlFor="ecphone">
          <input id="ecphone" type="tel" value={ecPhone} onChange={(e) => setEcPhone(e.target.value)} placeholder="(760) 555-0100" className={inputCls} />
        </Field>
      </div>

      <ErrorText>{error}</ErrorText>
      <button type="submit" disabled={busy || uploading} className={primaryBtn}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

/**
 * Sends a text to the emergency contact for every hike plan that is overdue
 * (past back_by + grace period) and hasn't been checked in.
 *
 * Call this every 5 minutes (see supabase/cron.sql). Protected by CRON_SECRET.
 */
import { createClient } from "@supabase/supabase-js";


const GRACE_MINUTES = Number(process.env.CHECKIN_GRACE_MINUTES ?? 30);

async function sendSms(to: string, body: string): Promise<{ ok: boolean; info: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) {
    console.warn(`[check-ins] Twilio not configured. Would text ${to}: ${body}`);
    return { ok: false, info: "twilio-not-configured" };
  }
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  return { ok: res.ok, info: res.ok ? "sent" : `twilio ${res.status}: ${await res.text()}` };
}

async function run(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return Response.json({ error: "supabase not configured" }, { status: 500 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const cutoff = new Date(Date.now() - GRACE_MINUTES * 60_000).toISOString();
  const { data: due, error } = await admin
    .from("hike_plans")
    .select("id, trail, partner_name, back_by, contact_name, contact_phone, profiles(display_name)")
    .is("checked_in_at", null)
    .is("alert_sent_at", null)
    .lt("back_by", cutoff)
    .limit(100);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const results = [];
  for (const p of due ?? []) {
    const hiker = (p.profiles as unknown as { display_name: string } | null)?.display_name ?? "Your contact";
    const back = new Date(p.back_by).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: process.env.ALERT_TIMEZONE ?? "America/Los_Angeles",
    });
    const body =
      `Switchback safety alert: ${hiker} planned to be back from ${p.trail} by ${back}` +
      (p.partner_name ? ` (hiking with ${p.partner_name})` : "") +
      ` and hasn't checked in. Try reaching them. If you can't and you're worried, call 911 and give them this trail.`;

    // Claim the row first so two overlapping runs can't both text.
    const { data: claimed } = await admin
      .from("hike_plans")
      .update({ alert_sent_at: new Date().toISOString() })
      .eq("id", p.id)
      .is("alert_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;

    const r = await sendSms(p.contact_phone, body);
    if (!r.ok) await admin.from("hike_plans").update({ alert_sent_at: null }).eq("id", p.id);
    results.push({ id: p.id, ...r });
  }

  return Response.json({ checked: due?.length ?? 0, results });
}

export const GET = run;
export const POST = run;

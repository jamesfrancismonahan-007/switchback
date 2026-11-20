"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useApp } from "@/components/AppProvider";
import { ErrorText, Field, inputCls, Logo, primaryBtn } from "@/components/ui";

export default function LoginPage() {
  const { ready, session } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && session) router.replace("/");
  }, [ready, session, router]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError(error.message);
  }

  return (
    <main className="flex flex-1 flex-col justify-center gap-8 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center text-forest">
        <Logo size={56} />
        <h1 className="font-display text-4xl font-bold">Switchback</h1>
        <p className="max-w-[300px] text-[15px] text-muted">
          Find people who want to do the same hikes, at your level, when you&apos;re free.
        </p>
      </div>

      {!sent ? (
        <form onSubmit={sendLink} className="flex flex-col gap-4">
          <Field label="Email" htmlFor="email">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={busy || !email.trim()} className={primaryBtn}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          <p className="text-center text-xs leading-relaxed text-muted">
            No password needed. You must be 18 or older to use Switchback.
          </p>
        </form>
      ) : (
        <form onSubmit={verify} className="flex flex-col gap-4">
          <div className="rounded-2xl bg-forest-tint px-4 py-3 text-sm text-forest">
            Check <strong>{email}</strong> and tap the link. If you added Switchback to your home screen, you can type
            the code from the email here instead.
          </div>
          <Field label="Code from the email" htmlFor="code">
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputCls}
            />
          </Field>
          <ErrorText>{error}</ErrorText>
          <button type="submit" disabled={busy || code.trim().length < 6} className={primaryBtn}>
            {busy ? "Checking…" : "Sign in"}
          </button>
          <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-forest">
            Use a different email
          </button>
        </form>
      )}
    </main>
  );
}

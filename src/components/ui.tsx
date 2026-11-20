"use client";

import type { ReactNode } from "react";
import { LEVEL_COLORS, type Level } from "@/lib/types";
import { colorFor, initials } from "@/lib/format";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l5 7h-3l4 6h-4l3 5H7l3-5H6l4-6H7z" />
      <rect x="11" y="19" width="2" height="4" />
    </svg>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  const c = LEVEL_COLORS[level];
  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: c.bg, color: c.fg }}>
      {level}
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-ink-soft">{children}</span>;
}

export function Avatar({
  id,
  name,
  url,
  size = 48,
  className = "",
}: {
  id: string;
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, background: colorFor(id), fontSize: size * 0.32 }}
    >
      {initials(name)}
    </span>
  );
}

export function TopHikes({ hikes }: { hikes: string[] }) {
  if (!hikes.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Top 3 hikes</span>
      {hikes.map((h, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-tint text-xs font-bold text-forest">
            {i + 1}
          </span>
          <span className="text-sm font-medium">{h}</span>
        </div>
      ))}
    </div>
  );
}

export function Sheet({
  title,
  onClose,
  children,
  icon,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/45"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mx-auto max-h-[90dvh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white px-4 pb-7 pt-5">
        <div className="flex items-center justify-between px-1 pb-2">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="font-display text-xl font-bold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-chip"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </div>
  );
}

export const inputCls =
  "min-h-12 w-full min-w-0 rounded-xl border border-line-strong bg-white px-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/20";

export const primaryBtn =
  "flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-forest px-5 text-[15px] font-bold text-white hover:bg-forest-dark disabled:cursor-not-allowed disabled:bg-[#8A948E]";

export const secondaryBtn =
  "flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-line-strong bg-white px-5 text-[15px] font-semibold text-ink hover:bg-chip";

export function ShieldIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
    </svg>
  );
}

export function MountainIcon({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 20l6-10 4 6 3-4 5 8z" />
    </svg>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="rounded-xl bg-[#F6DADA] px-3.5 py-2.5 text-sm font-medium text-[#7A1F1F]">
      {children}
    </p>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { statusText, type Tech } from "@/lib/m3";
import { cn } from "@/lib/utils";

/**
 * Technical-details card for a highlighted square.
 *
 * Methodology: the card is rendered into document.body (a portal) at a fixed position computed from
 * the square's bounding box, so the wireframe's scrolling frame never clips it. It opens on hover and on
 * keyboard focus, prefers the space above the square and flips below when there is no room.
 */

const statusStyle = {
  built: "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30",
  partial: "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  next: "bg-sky-400/15 text-sky-300 ring-sky-400/30",
} as const;

export function StatusBadge({ status }: { status: Tech["status"] }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ring-1", statusStyle[status])}>{statusText[status]}</span>;
}

function Card({ title, tech, rect }: { title: string; tech: Tech; rect: DOMRect }) {
  const W = 320;
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  useEffect(() => setH(ref.current?.offsetHeight ?? 0), [title]);
  const left = Math.max(8, Math.min(window.innerWidth - W - 8, rect.left + rect.width / 2 - W / 2));
  const above = rect.top - h - 12 > 8;
  const top = above ? rect.top - h - 12 : rect.bottom + 12;
  return (
    <div
      ref={ref}
      role="tooltip"
      style={{ left, top, width: W, visibility: h ? "visible" : "hidden" }}
      className="animate-in fade-in zoom-in-95 pointer-events-none fixed z-[100] rounded-xl border border-white/15 bg-[#0f1d33]/95 p-3.5 text-left shadow-2xl ring-1 ring-black/40 backdrop-blur duration-150"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-semibold text-white">{title}</span>
        <span className="ml-auto">
          <StatusBadge status={tech.status} />
        </span>
      </div>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-sky-300 uppercase">What it does</p>
      <ul className="mb-2.5 list-disc space-y-1 pl-4 text-[13px] leading-snug text-neutral-200 marker:text-sky-400">
        {tech.does.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-amber-300 uppercase">Needs / still to add</p>
      <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-neutral-300 marker:text-amber-400">
        {tech.needs.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Hover/focus handlers plus the card. Spread `handlers` on the element that IS the highlighted square
 * (its own box is measured), and render `card` anywhere inside the component.
 */
export function usePeek(title: string, tech: Tech) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const open = useCallback((e: React.SyntheticEvent<HTMLElement>) => setRect(e.currentTarget.getBoundingClientRect()), []);
  const close = useCallback(() => setRect(null), []);
  useEffect(() => {
    if (!rect) return;
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [rect, close]);
  const handlers = { onMouseEnter: open, onMouseLeave: close, onFocus: open, onBlur: close };
  const card = rect && typeof document !== "undefined" ? createPortal(<Card title={title} tech={tech} rect={rect} />, document.body) : null;
  return { handlers, card };
}

/** A focusable box that shows the technical card on hover or focus. */
export function TechPeek({ title, tech, children, className }: { title: string; tech: Tech; children: React.ReactNode; className?: string }) {
  const { handlers, card } = usePeek(title, tech);
  return (
    <span tabIndex={0} {...handlers} className={cn("relative block rounded-lg outline-2 outline-offset-2 outline-sky-400/70 outline-dashed transition-colors hover:bg-sky-400/10 focus-visible:outline-solid", className)}>
      {children}
      {card}
    </span>
  );
}

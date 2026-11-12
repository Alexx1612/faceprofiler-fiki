"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { nav, project } from "@/lib/content";
import { cn } from "@/lib/utils";

/** Logo: a face-scan frame around a dot. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M4 11V6a2 2 0 0 1 2-2h5M21 4h5a2 2 0 0 1 2 2v5M28 21v5a2 2 0 0 1-2 2h-5M11 28H6a2 2 0 0 1-2-2v-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="4.5" fill="currentColor" />
    </svg>
  );
}

/** Course milestones, each a page of its own. */
export const milestones = [
  { href: "/M2/", code: "M2", label: "Validation 1 (idea)" },
  { href: "/M3/", code: "M3", label: "Wireframe & landing page" },
];

/** "Milestones" drop-down: opens on click, closes on outside click or Escape. */
function MilestonesMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 items-center gap-1 rounded-full border border-sky-400/30 bg-sky-400/10 px-3 text-sm sm:min-h-9 text-sky-200 transition-colors hover:bg-sky-400/20"
      >
        Milestones <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-60 rounded-xl border border-white/10 bg-[#0f1520] p-1.5 shadow-xl">
          {milestones.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-neutral-200 hover:bg-white/5"
            >
              <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-xs font-semibold text-sky-300">{m.code}</span>
              {m.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sticky top bar; the link of the section in view is highlighted. On sub-pages (home=false) links go back to the home page. */
export function Nav({ home = true }: { home?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    nav.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) observer.observe(el);
    });
    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled ? "border-b border-white/[0.06] bg-[#0b0f17]/75 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href={home ? "#top" : "/"} className="flex min-h-11 shrink-0 items-center gap-2 font-semibold tracking-tight text-white">
          <Logo className="size-6 text-sky-400" />
          {project.name}
        </Link>
        <nav className="ml-auto flex min-w-0 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,black_80%,transparent)] [scrollbar-width:none] sm:pr-0 sm:[mask-image:none]">
          {nav.map((n) => (
            <Link
              key={n.id}
              href={home ? `#${n.id}` : `/#${n.id}`}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm transition-colors sm:min-h-9",
                active === n.id ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <MilestonesMenu />
      </div>
    </header>
  );
}

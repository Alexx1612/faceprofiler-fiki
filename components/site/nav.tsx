"use client";

import { useEffect, useState } from "react";

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

/** Sticky top bar; the link of the section in view is highlighted. */
export function Nav() {
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
        <a href="#top" className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-white">
          <Logo className="size-6 text-sky-400" />
          {project.name}
        </a>
        <nav className="-mr-4 ml-auto flex min-w-0 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,black_80%,transparent)] [scrollbar-width:none] sm:mr-0 sm:pr-0 sm:[mask-image:none]">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors",
                active === n.id ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
              )}
            >
              {n.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

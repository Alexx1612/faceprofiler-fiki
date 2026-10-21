"use client";

import { Mail } from "lucide-react";

import ExpandableProfileCard from "@/components/watermelon/expandable-profile-card";
import { asset, project, team } from "@/lib/content";
import { Logo } from "./nav";
import { Section } from "./section";

/** Team as Watermelon expandable profile cards: click a card for responsibilities and e-mail. */
export function Team() {
  return (
    <Section
      id="team"
      eyebrow="Team & roles"
      title="The people behind Nau-ino"
      lead="AI, platform and business. Click a card for details."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {team.map((m) => (
          <div key={m.email} className="flex flex-col gap-1.5">
            <ExpandableProfileCard
              imageSrc={asset(m.photo)}
              title={m.name}
              subtitle={m.role}
              className="h-28 w-full sm:h-32"
              content={
                <div className="flex flex-col gap-6">
                  <p>{m.bio}</p>
                  <div>
                    <h4 className="text-foreground mb-2 font-semibold tracking-tight">Owns</h4>
                    <ul className="text-muted-foreground flex flex-col gap-1.5">
                      {m.owns.map((o) => (
                        <li key={o} className="flex items-center gap-2">
                          <span className="size-1.5 rounded-full bg-sky-400" /> {o}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <a
                    href={`mailto:${m.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-primary text-primary-foreground flex items-center gap-2 self-start rounded-lg px-5 py-2.5 font-medium shadow-sm transition-opacity hover:opacity-90"
                  >
                    <Mail className="size-4" /> {m.email}
                  </a>
                </div>
              }
            />
            <a href={`mailto:${m.email}`} className="flex items-center gap-2 px-1 text-sm text-neutral-400 transition-colors hover:text-sky-300">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{m.email}</span>
            </a>
            <p className="px-1 text-xs text-neutral-500">{m.owns.join(" · ")}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 font-semibold text-white">
          <Logo className="size-5 text-sky-400" /> {project.name}
        </div>
        <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
          Demo footage: Mixkit free stock video, fictional names. Team photos are placeholder cats (Wikimedia Commons, public domain / CC0). UI built with Cult UI and Watermelon UI components.
          Figures marked as estimates or targets are assumptions, not results.
        </p>
      </div>
    </footer>
  );
}

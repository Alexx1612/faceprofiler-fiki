"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { m2Questions } from "@/lib/m2";
import { team } from "@/lib/content";

/**
 * Customer discovery form with the improved questions. The site is static, so answers are sent by
 * opening the visitor's e-mail app with everything filled in, addressed to the team lead.
 */
export function M2Form() {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  const to = team[0].email;

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = [
      `Role: ${answers.role ?? ""}`,
      `Type of building: ${answers.site ?? ""}`,
      "",
      ...m2Questions.map((q, i) => `${i + 1}. [${q.time}] ${q.improved}\n${answers[`q${i}`] ?? ""}\n`),
    ];
    window.location.href = `mailto:${to}?subject=${encodeURIComponent("Nau-ino customer discovery answers")}&body=${encodeURIComponent(lines.join("\n"))}`;
  };

  const field = "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-neutral-400 focus:border-sky-400/50 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-sky-400";

  return (
    <form onSubmit={send} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Your role
          <input className={field} placeholder="Teacher, director, guard, administrator..." onChange={(e) => set("role", e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-300">
          Type of building
          <select className={field} defaultValue="" onChange={(e) => set("site", e.target.value)}>
            <option value="" disabled>Choose one</option>
            {["School / kindergarten", "Student dorm", "Elderly care home", "Office building", "Mall / shop", "Military / restricted site", "Other public place"].map((s) => (
              <option key={s} className="bg-[#0f1520]">{s}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
      {(["Day", "Night"] as const).map((t) => (
        <fieldset key={t} className={`flex flex-col gap-3 rounded-xl border p-3 ${t === "Day" ? "border-amber-300/20 bg-amber-300/[0.03]" : "border-indigo-300/20 bg-indigo-300/[0.04]"}`}>
          <legend className={`px-1 text-xs font-semibold tracking-wider uppercase ${t === "Day" ? "text-amber-300" : "text-indigo-300"}`}>{t === "Day" ? "☀ During the day" : "☾ At night"}</legend>
          {m2Questions.map((q, i) =>
            q.time === t ? (
              <label key={i} className="flex flex-col gap-1 text-sm text-neutral-200">
                {i + 1}. {q.improved}
                <textarea rows={2} className={field} onChange={(e) => set(`q${i}`, e.target.value)} />
              </label>
            ) : null
          )}
        </fieldset>
      ))}
      </div>
      <button type="submit" className="flex items-center gap-2 self-start rounded-full bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-400">
        <Send className="size-4" /> Send answers by e-mail
      </button>
      <p className="text-xs text-neutral-400">Opens your e-mail app with the answers filled in. Nothing is stored on this site.</p>
    </form>
  );
}

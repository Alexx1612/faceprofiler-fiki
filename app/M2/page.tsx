import type { Metadata } from "next";

import { M2Form } from "@/components/site/m2-form";
import { Nav } from "@/components/site/nav";
import { Section } from "@/components/site/section";
import { Footer } from "@/components/site/team";
import { m2Evidence, m2Insights, m2Interviews, m2Plan, m2Problem, m2Questions, m2Ready, m2Solution } from "@/lib/m2";

export const metadata: Metadata = {
  title: "Nau-ino · M2 Validation 1",
  description: "Milestone 2: customer discovery for Nau-ino, problem first, then the solution.",
};

const card = "rounded-2xl border border-white/10 bg-white/[0.02] p-4";
const h3 = "mb-1.5 text-sm font-semibold text-white";

/** Milestone 2 (Validation 1, idea): the documented customer discovery process. */
export default function M2() {
  return (
    <>
      <Nav home={false} />
      <main className="pt-16">
        <Section
          id="m2"
          eyebrow="Milestone 2 · Validation 1 (idea)"
          title="Customer discovery: problem first, then the solution"
          lead="How we found the problem, what we first thought would solve it, who we talked to, what we asked, and what changed."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className={card}>
              <p className="text-xs font-semibold tracking-wider text-red-300 uppercase">1 · How we identified the problem</p>
              <p className="mt-2 text-sm text-neutral-300">{m2Problem.observed}</p>
              <p className="mt-2 text-sm text-neutral-400">
                <b className="text-white">What we had to find out:</b> {m2Problem.question}
              </p>
            </div>
            <div className={card}>
              <p className="text-xs font-semibold tracking-wider text-sky-300 uppercase">2 · What we thought would solve it</p>
              <p className="mt-2 text-sm text-neutral-300">{m2Solution.idea}</p>
              <p className="mt-2 text-sm text-neutral-400">{m2Solution.caveat}</p>
            </div>
          </div>
        </Section>

        <Section id="plan" eyebrow="3 · Plan" title="Our customer discovery plan" lead="A short overview before the details.">
          <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {m2Plan.map((p) => (
              <li key={p.step} className={card}>
                <p className={h3}>{p.step}</p>
                <p className="text-sm text-neutral-400">{p.text}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="process" eyebrow="4 · Process" title="Who we talked to and how" lead={m2Interviews.why}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={card}>
              <p className={h3}>Segment and place</p>
              <p className="text-sm text-neutral-400">{m2Interviews.where}</p>
            </div>
            <div className={card}>
              <p className={h3}>People interviewed</p>
              <ul className="text-sm text-neutral-400">
                {m2Interviews.who.map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            </div>
            <div className={card}>
              <p className={h3}>Method</p>
              <p className="text-sm text-neutral-400">{m2Interviews.how}</p>
            </div>
          </div>

          <h3 className="mt-6 mb-2 text-base font-semibold text-white">The questions: first draft vs improved</h3>
          <p className="mb-3 text-sm text-neutral-400">
            Our first draft was short and closed, so it was easy to answer &quot;no, everything is fine&quot;. We rewrote every question to ask about real past events, and added a question about who responds at night.
          </p>
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/[0.04] text-xs text-neutral-300 uppercase">
                <tr>
                  <th className="p-2.5">#</th>
                  <th className="p-2.5">When</th>
                  <th className="p-2.5">First draft (weak)</th>
                  <th className="p-2.5">Improved (used)</th>
                </tr>
              </thead>
              <tbody>
                {m2Questions.map((q, i) => (
                  <tr key={i} className="border-t border-white/5 align-top">
                    <td className="p-2.5 text-neutral-500">{i + 1}</td>
                    <td className="p-2.5">
                      <span className={q.time === "Day" ? "text-amber-300" : "text-indigo-300"}>{q.time}</span>
                    </td>
                    <td className="p-2.5 text-neutral-500 line-through decoration-red-400/40">{q.draft}</td>
                    <td className="p-2.5 text-neutral-200">
                      {q.improved}
                      {q.isNew && <span className="ml-2 rounded bg-emerald-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 uppercase">new</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section id="insights" eyebrow="5 · Insights" title="How the answers changed the product">
          <div className="grid gap-3 sm:grid-cols-2">
            {m2Insights.map((x) => (
              <div key={x.title} className={card}>
                <p className={h3}>{x.title}</p>
                <p className="text-sm text-neutral-400">{x.text}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="ready" eyebrow="6 · Next stage" title="Ready for Customer Validation?" lead={m2Ready.verdict}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className={card}>
              <p className="mb-2 text-sm font-semibold text-emerald-300">What we already have</p>
              <ul className="flex flex-col gap-1.5 text-sm text-neutral-300">
                {m2Ready.forReasons.map((r) => (
                  <li key={r}>✓ {r}</li>
                ))}
              </ul>
            </div>
            <div className={card}>
              <p className="mb-2 text-sm font-semibold text-amber-300">Why we are not 100% sure yet</p>
              <ul className="flex flex-col gap-1.5 text-sm text-neutral-300">
                {m2Ready.againstReasons.map((r) => (
                  <li key={r}>! {r}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 rounded-xl border border-sky-300/15 bg-sky-400/[0.07] p-3 text-sm text-white">{m2Ready.next}</p>
        </Section>

        <Section id="form" eyebrow="Questionnaire" title="Answer our questions" lead="For staff of schools, dorms, care homes, offices, malls and other buildings.">
          <M2Form />
        </Section>

        <Section id="evidence" eyebrow="Proof" title="Evidence for this milestone">
          <ul className="grid gap-2 sm:grid-cols-2">
            {m2Evidence.map((e) => (
              <li key={e.item} className={card}>
                <p className={h3}>{e.item}</p>
                <p className="text-sm text-neutral-400">{e.status}</p>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <Footer />
    </>
  );
}

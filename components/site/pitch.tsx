import { asset, competitors, matrix, pitch, plans, team } from "@/lib/content";
import { Section } from "./section";

const card = "rounded-2xl border border-white/10 bg-white/[0.03] p-5";
const list = "text-muted-foreground max-w-4xl list-disc space-y-2 pl-5 leading-relaxed";

/** The pitch, section by section; all text lives in lib/content.ts (`pitch`). One title per section, no badges. */
export function PitchPage() {
  const cell = (v: string) => (v === "yes" ? "Yes" : v === "no" ? "No" : "Partly");
  return (
    <>
      <Section id="pitch" level={1} title={pitch.headline} lead={pitch.lead}>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-xl">
          <video className="aspect-video w-full" src={asset("/intro/nau-ino-intro.mp4")} poster={asset("/intro/nau-ino-intro.jpg")} controls playsInline preload="metadata" />
        </div>
      </Section>

      <Section id="pitch-problem" title="Most CCTV footage is never watched">
        <ul className={list}>
          {pitch.problem.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Section>

      <Section id="pitch-how" title="How it works">
        <ol className={list.replace("list-disc", "list-decimal")}>
          {pitch.how.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
      </Section>

      <Section id="pitch-product" title="Two uses of the same software" lead="Both run on an ordinary Windows computer without a graphics card.">
        <div className="grid gap-3 sm:grid-cols-2">
          {pitch.products.map((p) => (
            <div key={p.who} className={card}>
              <h3 className="font-heading font-semibold text-neutral-100">{p.who}</h3>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="pitch-proof" title="What we have measured so far" lead={pitch.proofNote}>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th className="p-3 font-medium text-neutral-300">Test</th>
                <th className="p-3 font-medium text-neutral-300">Result</th>
                <th className="p-3 font-medium text-neutral-300">Setup</th>
              </tr>
            </thead>
            <tbody>
              {pitch.proof.map((r) => (
                <tr key={r.test} className="border-t border-white/5">
                  <td className="p-3 text-neutral-200">{r.test}</td>
                  <td className="p-3 font-semibold text-sky-300">{r.result}</td>
                  <td className="text-muted-foreground p-3">{r.setup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="pitch-validation" title="What we heard in interviews" lead={pitch.interviewNote}>
        <div className="grid gap-3 sm:grid-cols-3">
          {pitch.validation.map((s) => (
            <div key={s.label} className={card}>
              <p className="font-heading text-2xl font-semibold text-neutral-100 sm:text-3xl">{s.value}</p>
              <p className="text-muted-foreground mt-1 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="pitch-market" title="Where we start: Romanian schools" lead="After that: care homes, small offices and security integrators in the rest of the EU.">
        <div className="grid gap-3 sm:grid-cols-3">
          {pitch.market.map((m) => (
            <div key={m.value} className={card}>
              <p className="font-heading text-2xl font-semibold text-neutral-100 sm:text-3xl">{m.value}</p>
              <p className="text-muted-foreground mt-1 text-sm">{m.text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="pitch-model"
        title="Pricing"
        lead="Plus a one-time setup fee of €300–1,000 per site and an optional pre-installed computer from €900. Our running costs are low because the video is processed on the customer’s computer, not on our servers."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className={card}>
              <h3 className="font-heading font-semibold text-neutral-100">{p.name}</h3>
              <p className="mt-1 text-xl font-semibold text-neutral-100">
                {p.priceYearly}
                {p.priceYearly !== "Custom" && <span className="text-muted-foreground text-sm font-normal"> per camera per month, billed yearly</span>}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">{p.description}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="pitch-competition" title="How we compare" lead={`Based on the public product pages of ${competitors.map((c) => c.name).join(", ")}.`}>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-white/[0.04] text-left">
                <th className="p-3" />
                {matrix.columns.map((c) => (
                  <th key={c} className="p-3 font-medium text-neutral-300">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((r) => (
                <tr key={r.label} className="border-t border-white/5">
                  <td className="p-3 text-neutral-200">{r.label}</td>
                  {r.values.map((v, i) => (
                    <td key={i} className={i === 0 ? "p-3 font-semibold text-sky-300" : "text-muted-foreground p-3"}>
                      {cell(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="pitch-why-now" title="Why this is possible now">
        <p className="text-muted-foreground max-w-4xl leading-relaxed">{pitch.whyNow}</p>
      </Section>

      <Section id="pitch-team" title="Team" lead="Both students at Politehnica University of Bucharest.">
        <div className="grid gap-3 sm:grid-cols-2">
          {team
            .filter((m) => !m.hidden)
            .map((m) => (
              <div key={m.name} className={card}>
                <h3 className="font-heading font-semibold text-neutral-100">{m.name}</h3>
                <p className="text-sm text-sky-300">{m.role}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{m.bio}</p>
              </div>
            ))}
        </div>
      </Section>

      <Section id="pitch-ask" title="What we are asking for" lead={pitch.ask.lead}>
        <div className="overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <tbody>
              {pitch.ask.steps.map((s) => (
                <tr key={s.when} className="border-t border-white/5 first:border-t-0">
                  <td className="w-32 p-3 font-semibold text-neutral-200">{s.when}</td>
                  <td className="text-muted-foreground p-3">{s.goal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}

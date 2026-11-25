"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * PostHog-style extras for the owner's view of /analytics/: click heatmap, frustration (rage and dead
 * clicks), scroll depth, retention and top paths. All numbers come from the collector (behaviourStats in
 * collector/Code.gs); this file only draws them.
 *
 * Methodology (heatmap): clicks carry their position in % of the document, so a grid of 2 % cells can be
 * laid over the page at any size. The page itself is shown in a same-origin iframe at the device's width
 * (phone 390, tablet 820, desktop 1440 px), scaled to fit; the iframe is inert (no pointer events) and the
 * collector ignores pages inside frames, so viewing a heatmap never adds visits. If the page cannot be
 * measured (blocked frame), a neutral outline of the same proportions is used instead.
 */

type Count = { key: string; count: number };
export type HeatmapData = { path: string; device: string; clicks: number; cols: number; rows: number; cells: [number, number, number][]; top: Count[] };
export type Behaviour = {
  heatmaps: HeatmapData[];
  frustration: { rage: { path: string; label: string; count: number }[]; dead: { path: string; label: string; count: number }[] };
  scroll: { path: string; visitors: number; r25: number; r50: number; r75: number; r100: number; median: number | null }[];
  retention: { visitors: number; returning: number; returning_rate: number; cohorts: { week: string; size: number; w1: number; w2: number; w3: number }[] };
  paths: Count[];
};

const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const h4 = "mb-3 text-sm font-semibold text-white";
const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => x.toLocaleString("en-US");
const WIDTH: Record<string, number> = { phone: 390, tablet: 820, desktop: 1440 };
const short = (p: string) => p.replace(/^\/faceprofiler-fiki/, "") || "/";

function Takeaway({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm text-neutral-200">{children}</p>;
}

/** Heat colour for a share of the hottest cell (transparent blue → amber → red). */
function heat(t: number) {
  const a = 0.18 + 0.62 * t;
  if (t < 0.4) return `rgba(57,135,229,${a})`;
  if (t < 0.75) return `rgba(201,133,0,${a})`;
  return `rgba(217,89,38,${a})`;
}

export function HeatmapView({ b }: { b?: Behaviour }) {
  const maps = useMemo(() => b?.heatmaps ?? [], [b]);
  const pages = useMemo(() => [...new Set(maps.map((m) => m.path))], [maps]);
  const [page, setPage] = useState(pages[0] ?? "");
  const devices = maps.filter((m) => m.path === page).map((m) => m.device);
  const [dev, setDev] = useState(devices[0] ?? "phone");
  const m = maps.find((x) => x.path === page && x.device === dev) ?? maps.find((x) => x.path === page);
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [boxW, setBoxW] = useState(600);
  const [docH, setDocH] = useState(2400);
  const [outline, setOutline] = useState(false);
  const vw = WIDTH[m?.device ?? "phone"] ?? 390;

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!maps.length) return <p className="text-sm text-neutral-400">No clicks with a position yet (collector 1.4 records them).</p>;
  const scale = Math.min(1, boxW / vw);
  const hottest = Math.max(1, ...(m?.cells ?? []).map((c) => c[2]));
  const onLoad = () => {
    try {
      const h = frame.current?.contentDocument?.documentElement.scrollHeight;
      if (h) {
        setDocH(h);
        setOutline(false);
      } else setOutline(true);
    } catch {
      setOutline(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-300">
          Page
          <select value={page} onChange={(e) => setPage(e.target.value)} className="min-h-11 rounded-xl border border-white/15 bg-[#0a1529] px-3 text-white">
            {pages.map((p) => (
              <option key={p} value={p}>
                {short(p)}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-flex rounded-full border border-white/15 p-1" role="group" aria-label="Device">
          {["phone", "tablet", "desktop"].map((d) => (
            <button
              key={d}
              type="button"
              disabled={!devices.includes(d)}
              aria-pressed={dev === d}
              onClick={() => setDev(d)}
              className={`min-h-9 rounded-full px-3 text-sm capitalize disabled:opacity-30 ${dev === d ? "bg-sky-600 font-semibold text-white" : "text-neutral-300"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      {m && (
        <Takeaway>
          {num(m.clicks)} clicks on {short(m.path)} ({m.device}). Most clicked: {m.top[0]?.key ?? "—"}
          {m.top[0] ? ` (${num(m.top[0].count)})` : ""}.
        </Takeaway>
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div ref={wrap} className="max-h-[640px] overflow-auto rounded-xl border border-white/10 bg-[#0a1529]" data-heatmap>
          <div style={{ width: vw * scale, height: docH * scale }} className="relative">
            <div style={{ width: vw, height: docH, transform: `scale(${scale})`, transformOrigin: "0 0" }} className="absolute left-0 top-0">
              {outline ? (
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#0f1d36,#0f1d36_119px,#16284a_120px)]" aria-hidden />
              ) : (
                <iframe
                  ref={frame}
                  key={`${m?.path}|${vw}`}
                  title={`Page under the heatmap: ${short(m?.path ?? "")}`}
                  src={m?.path}
                  onLoad={onLoad}
                  onError={() => setOutline(true)}
                  sandbox="allow-same-origin allow-scripts"
                  className="pointer-events-none absolute inset-0 h-full w-full border-0 bg-white"
                  tabIndex={-1}
                />
              )}
              <div className="pointer-events-none absolute inset-0" aria-hidden>
                {(m?.cells ?? []).map(([c, r, n]) => (
                  <span
                    key={`${c},${r}`}
                    className="absolute rounded-sm"
                    style={{ left: `${(c / (m?.cols ?? 50)) * 100}%`, top: `${(r / (m?.rows ?? 50)) * 100}%`, width: `${100 / (m?.cols ?? 50)}%`, height: `${100 / (m?.rows ?? 50)}%`, background: heat(n / hottest) }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className={box}>
          <p className={h4}>Most clicked here</p>
          <ol className="space-y-1.5 text-sm">
            {(m?.top ?? []).map((t) => (
              <li key={t.key} className="flex justify-between gap-3">
                <span className="min-w-0 truncate text-neutral-200">{t.key}</span>
                <span className="tabular-nums text-white">{num(t.count)}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-neutral-400">Cells are 2 % of the page wide and high. Blue = few clicks, red = the most.</p>
        </div>
      </div>
    </div>
  );
}

function FrustrationList({ title, rows, empty }: { title: string; rows: { path: string; label: string; count: number }[]; empty: string }) {
  return (
    <div className={box}>
      <p className={h4}>{title}</p>
      {rows.length ? (
        <ol className="space-y-2 text-sm">
          {rows.map((r) => (
            <li key={`${r.path}|${r.label}`} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-white">{r.label}</span>
                <span className="block truncate text-xs text-neutral-400">{short(r.path)}</span>
              </span>
              <span className="tabular-nums text-white">{num(r.count)}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-neutral-400">{empty}</p>
      )}
    </div>
  );
}

export function FrustrationView({ b }: { b?: Behaviour }) {
  const f = b?.frustration ?? { rage: [], dead: [] };
  const worst = f.rage[0] ?? f.dead[0];
  return (
    <div className="flex flex-col gap-4">
      <Takeaway>
        {worst ? `Most frustration: “${worst.label}” on ${short(worst.path)} (${num(worst.count)}).` : "No rage or dead clicks recorded yet."} Rage click = 3+ clicks
        in 1 s on the same spot; dead click = a click on something that does nothing.
      </Takeaway>
      <div className="grid gap-4 md:grid-cols-2">
        <FrustrationList title="Rage clicks" rows={f.rage} empty="None yet." />
        <FrustrationList title="Dead clicks" rows={f.dead} empty="None yet." />
      </div>
    </div>
  );
}

export function RetentionView({ b }: { b?: Behaviour }) {
  const r = b?.retention;
  const sc = b?.scroll ?? [];
  const paths = b?.paths ?? [];
  const maxPath = Math.max(1, ...paths.map((p) => p.count));
  return (
    <div className="flex flex-col gap-6">
      <section className={box} aria-labelledby="scroll-h">
        <p id="scroll-h" className={h4}>
          Scroll depth
        </p>
        <Takeaway>
          {sc[0]
            ? `On ${short(sc[0].path)}, ${pct(sc[0].r50)} of visitors scrolled at least halfway and ${pct(sc[0].r100)} reached the end.`
            : "No scroll data yet (collector 1.4 records it when a visitor leaves a page)."}
        </Takeaway>
        {sc.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-xs text-neutral-400">
                <tr>
                  <th className="py-1 text-left font-normal">Page</th>
                  <th className="py-1 text-right font-normal">Visitors</th>
                  {["25%", "50%", "75%", "End"].map((t) => (
                    <th key={t} className="py-1 text-right font-normal">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sc.map((p) => (
                  <tr key={p.path} className="border-t border-white/10">
                    <td className="py-1.5 text-white">{short(p.path)}</td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-200">{num(p.visitors)}</td>
                    {[p.r25, p.r50, p.r75, p.r100].map((v, i) => (
                      <td key={i} className="py-1.5 text-right tabular-nums" style={{ color: `rgba(183,211,246,${0.45 + 0.55 * v})` }}>
                        {pct(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={box} aria-labelledby="ret-h">
        <p id="ret-h" className={h4}>
          Retention
        </p>
        <Takeaway>
          {r && r.visitors
            ? `${num(r.returning)} of ${num(r.visitors)} visitors (${pct(r.returning_rate)}) came back on another day.`
            : "No visitors yet."}
        </Takeaway>
        {r && r.cohorts.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="text-xs text-neutral-400">
                <tr>
                  <th className="py-1 text-left font-normal">First visit (week of)</th>
                  <th className="py-1 text-right font-normal">Visitors</th>
                  <th className="py-1 text-right font-normal">+1 week</th>
                  <th className="py-1 text-right font-normal">+2 weeks</th>
                  <th className="py-1 text-right font-normal">+3 weeks</th>
                </tr>
              </thead>
              <tbody>
                {r.cohorts.map((c) => (
                  <tr key={c.week} className="border-t border-white/10">
                    <td className="py-1.5 text-white">{c.week}</td>
                    <td className="py-1.5 text-right tabular-nums text-neutral-200">{num(c.size)}</td>
                    {[c.w1, c.w2, c.w3].map((n, i) => (
                      <td key={i} className="py-1.5 text-right tabular-nums text-neutral-200">
                        {n ? `${num(n)} · ${pct(n / c.size)}` : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={box} aria-labelledby="paths-h">
        <p id="paths-h" className={h4}>
          Top paths (first three pages of a visit)
        </p>
        {paths.length ? (
          <ol className="space-y-2 text-sm">
            {paths.map((p) => (
              <li key={p.key}>
                <div className="flex justify-between gap-3">
                  <span className="min-w-0 break-words text-neutral-200">{p.key.split(" → ").map(short).join(" → ")}</span>
                  <span className="tabular-nums text-white">{num(p.count)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-sky-500" style={{ width: `${(p.count / maxPath) * 100}%` }} />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-neutral-400">No visits yet.</p>
        )}
      </section>
    </div>
  );
}

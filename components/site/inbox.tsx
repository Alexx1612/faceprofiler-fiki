"use client";

import { Download, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ownerFetch } from "@/lib/owner-auth";

/**
 * Form inbox (Formspree-like), owner only: every submission with filters, search, detail, status
 * (new / handled / spam / archived), a note, duplicates ("seen N times"), a spam hint and CSV export.
 *
 * Methodology: the list comes from the collector's owner route (`route=inbox`, collector/Inbox.gs), which
 * checks the Google sign-in; status and notes are written there to a separate sheet, so the hash-chained
 * `forms` sheet is never edited. Filtering, search and the CSV are done here on the returned JSON; the CSV
 * holds exactly the rows the filters show.
 */

type Item = {
  row_id: string;
  received_at: number;
  form: string;
  version: string;
  path: string;
  test: boolean;
  verified: boolean;
  data: Record<string, string>;
  status: "new" | "handled" | "spam" | "archived";
  note: string;
  status_by: string;
  status_at: number;
  seen: number;
  spam: { score: number; reasons: string[]; suggest: string };
};
type InboxPayload = { ok: true; total: number; counts: Record<string, number>; items: Item[] };

const box = "rounded-2xl border border-white/10 bg-white/[0.03] p-4";
const field = "min-h-11 rounded-xl border border-white/15 bg-[#0a1529] px-3 text-sm text-white";
const FORMS: Record<string, string> = { pilot: "Newsletter / pilot invite", updates: "Newsletter", survey: "Survey" };
const STATUSES = ["new", "handled", "spam", "archived"] as const;
const when = (ms: number) => new Date(ms).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** CSV of the given rows: fixed columns first, then every data field that appears. */
export function toCsv(items: Item[]): string {
  const keys = [...new Set(items.flatMap((i) => Object.keys(i.data)))].sort();
  const head = ["received_at", "form", "status", "note", "test", "verified", "seen", ...keys];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = items.map((i) =>
    [new Date(i.received_at).toISOString(), i.form, i.status, i.note, i.test, i.verified, i.seen, ...keys.map((k) => i.data[k])].map(esc).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function Inbox({ token }: { token: string }) {
  const [data, setData] = useState<InboxPayload | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState("all");
  const [status, setStatus] = useState("open");
  const [traffic, setTraffic] = useState<"real" | "test" | "all">("real");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const load = useCallback(
    async (extra: Record<string, string> = {}) => {
      setBusy(true);
      const r = await ownerFetch<InboxPayload>(token, { route: "inbox", ...extra });
      setBusy(false);
      if ("items" in r && r.ok) {
        setData(r);
        setError("");
      } else setError("error" in r ? r.error : "Could not load the inbox.");
    },
    [token],
  );
  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const fromMs = from ? Date.parse(`${from}T00:00:00`) : -Infinity;
    const toMs = to ? Date.parse(`${to}T23:59:59`) : Infinity;
    return (data?.items ?? []).filter(
      (i) =>
        (form === "all" || i.form === form) &&
        (status === "all" || (status === "open" ? i.status === "new" || i.status === "handled" : i.status === status)) &&
        (traffic === "all" || (traffic === "test") === i.test) &&
        (!verifiedOnly || i.verified) &&
        i.received_at >= fromMs &&
        i.received_at <= toMs &&
        (!term || [i.data.email, i.data.school, i.data.name, i.data.role].some((v) => String(v ?? "").toLowerCase().includes(term))),
    );
  }, [data, form, status, traffic, verifiedOnly, from, to, q]);
  const cur = items.find((i) => i.row_id === sel) ?? null;

  useEffect(() => setNote(cur?.note ?? ""), [cur?.row_id, cur?.note]);

  const setItemStatus = (st: string) => cur && void load({ action: "status", row_id: cur.row_id, status: st, note });
  const exportCsv = () => {
    const blob = new Blob([toCsv(items)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nauino-inbox-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (error) return <p className="text-sm text-amber-200">Inbox unavailable: {error}. Owner sign-in and collector 1.4 with Inbox.gs are needed.</p>;
  if (!data) return <p className="text-sm text-neutral-400">Loading the inbox…</p>;

  return (
    <div className="flex flex-col gap-4" data-inbox>
      <p className="text-sm text-neutral-200">
        {data.total} submissions · {STATUSES.map((s) => `${data.counts[s] ?? 0} ${s}`).join(" · ")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Form" value={form} onChange={(e) => setForm(e.target.value)} className={field}>
          <option value="all">All forms</option>
          {Object.entries(FORMS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={field}>
          <option value="open">New + handled</option>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Traffic" value={traffic} onChange={(e) => setTraffic(e.target.value as "real" | "test" | "all")} className={field}>
          <option value="real">Real</option>
          <option value="test">Test</option>
          <option value="all">Real + test</option>
        </select>
        <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-300">
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} /> Google-verified
        </label>
        <input aria-label="From date" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={field} />
        <input aria-label="To date" type="date" value={to} onChange={(e) => setTo(e.target.value)} className={field} />
        <input aria-label="Search e-mail or school" placeholder="Search e-mail, school…" value={q} onChange={(e) => setQ(e.target.value)} className={`${field} min-w-0 flex-1`} />
        <button type="button" onClick={exportCsv} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:bg-white/5">
          <Download aria-hidden className="size-4" /> CSV ({items.length})
        </button>
        <button type="button" onClick={() => void load()} disabled={busy} className="flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:bg-white/5">
          <RefreshCw aria-hidden className={`size-4 ${busy ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <ul className={`${box} max-h-[560px] divide-y divide-white/10 overflow-auto p-2`} aria-label="Submissions">
          {items.length === 0 && <li className="p-3 text-sm text-neutral-400">Nothing matches these filters.</li>}
          {items.map((i) => (
            <li key={i.row_id}>
              <button
                type="button"
                onClick={() => setSel(i.row_id)}
                aria-current={sel === i.row_id}
                className={`flex min-h-14 w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left hover:bg-white/[0.05] ${sel === i.row_id ? "bg-white/[0.07]" : ""}`}
              >
                <span className="flex flex-wrap items-center gap-2 text-sm text-white">
                  <span className="font-medium">{FORMS[i.form] ?? i.form}</span>
                  {i.verified && <ShieldCheck aria-label="Google-verified" className="size-4 text-emerald-300" />}
                  {i.test && <span className="rounded bg-amber-400 px-1 text-[10px] font-bold text-amber-950">TEST</span>}
                  {i.spam.suggest && i.status !== "spam" && <span className="rounded bg-red-500/20 px-1.5 text-[11px] text-red-200">spam?</span>}
                  {i.seen > 1 && <span className="rounded bg-white/10 px-1.5 text-[11px] text-neutral-200">seen {i.seen}×</span>}
                  <span className="ml-auto text-xs text-neutral-400">{when(i.received_at)}</span>
                </span>
                <span className="truncate text-xs text-neutral-300">
                  {i.data.email || (i.form === "survey" ? `${i.data.role ?? "anonymous"}` : "—")}
                  {i.data.school ? ` · ${i.data.school}` : ""} · {i.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className={box} aria-live="polite">
          {!cur ? (
            <p className="text-sm text-neutral-400">Pick a submission to see every field.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-base font-semibold text-white">
                {FORMS[cur.form] ?? cur.form} <span className="text-sm font-normal text-neutral-400">· {when(cur.received_at)}</span>
              </p>
              {cur.form === "pilot" && (
                <p className={`text-sm ${cur.verified ? "text-emerald-300" : "text-amber-200"}`}>
                  {cur.verified ? "E-mail verified by Google sign-in." : `Not verified${cur.data.verify_error ? `: ${cur.data.verify_error}` : ""}.`}
                  {cur.data.call === "yes" || cur.data.call === "true" ? ` Wants a phone call${cur.data.call_time ? ` (${cur.data.call_time})` : ""}.` : ""}
                </p>
              )}
              {cur.spam.reasons.length > 0 && <p className="text-sm text-red-200">Spam hint: {cur.spam.reasons.join(", ")}.</p>}
              {cur.seen > 1 && <p className="text-sm text-neutral-300">This e-mail sent {cur.seen} submissions.</p>}
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
                {Object.entries(cur.data)
                  .filter(([k]) => k !== "elapsed_ms")
                  .map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-neutral-400">{k}</dt>
                      <dd className="break-words text-white">{v}</dd>
                    </div>
                  ))}
              </dl>
              <label className="flex flex-col gap-1 text-sm text-neutral-300">
                Note
                <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} className="rounded-xl border border-white/15 bg-[#0a1529] p-2 text-white" />
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => setItemStatus(s)}
                    aria-pressed={cur.status === s}
                    className={`min-h-10 rounded-full px-4 text-sm capitalize ${cur.status === s ? "bg-sky-600 font-semibold text-white" : "border border-white/15 text-neutral-200 hover:bg-white/5"}`}
                  >
                    {s === "new" ? "Mark new" : s}
                  </button>
                ))}
              </div>
              {cur.status_by && (
                <p className="text-xs text-neutral-400">
                  Last change {when(cur.status_at)} by {cur.status_by}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

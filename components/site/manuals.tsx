"use client";

import { Download, ExternalLink, Eye, X } from "lucide-react";
import { useState } from "react";

import { track } from "@/lib/analytics";
import { asset } from "@/lib/content";
import manifest from "@/public/manuals/manifest.json";
import { cn } from "@/lib/utils";

/**
 * User manuals: one card per app, English or Romanian, read inline or download the PDF.
 *
 * Methodology: the PDFs, their covers and manifest.json are generated in the Nau-ino repo by
 * tools/make_manuals.py and copied to public/manuals/. Phones often cannot show a PDF inside a page,
 * so below the md breakpoint "View" opens the PDF in the browser's own viewer instead of an inline frame.
 */
type Lang = "en" | "ro";
type Manual = (typeof manifest.manuals)[number];

const L = {
  en: { view: "Read online", open: "Open PDF", dl: "Download PDF", pages: "pages", close: "Close", reading: "Reading" },
  ro: { view: "Citește online", open: "Deschide PDF", dl: "Descarcă PDF", pages: "pagini", close: "Închide", reading: "Citești" },
};

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`;

export function Manuals() {
  const [lang, setLang] = useState<Lang>("en");
  const [open, setOpen] = useState<Manual | null>(null);
  const t = L[lang];
  const file = (m: Manual) => m.files[lang];

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Language" className="flex w-fit rounded-full border border-white/15 p-0.5 text-sm">
        {(["en", "ro"] as const).map((l) => (
          <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)} className={cn("min-h-10 rounded-full px-4", lang === l ? "bg-sky-600 text-white" : "text-neutral-300")}>
            {l === "en" ? "English" : "Română"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {manifest.manuals.map((m) => {
          const f = file(m);
          const href = asset(`/manuals/${f.pdf}`);
          return (
            <article key={m.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset(`/manuals/${m.cover}`)} alt="" width={m.coverWidth} height={m.coverHeight} className="aspect-[210/297] h-auto w-full bg-white object-cover object-top" loading="lazy" />
              <div className="flex flex-1 flex-col gap-2 p-4">
                <h2 className="text-base font-semibold text-white">{m.title[lang]}</h2>
                <p className="text-sm text-neutral-300">{m.summary[lang]}</p>
                <p className="text-xs text-neutral-400">
                  {m.version} · {f.pages} {t.pages} · {mb(f.bytes)}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button
                    onClick={() => setOpen(m)}
                    className="hidden min-h-10 items-center gap-1.5 rounded-full bg-sky-600 px-3.5 text-sm font-medium text-white hover:bg-sky-500 md:inline-flex"
                  >
                    <Eye className="size-4" /> {t.view}
                  </button>
                  <a href={href} target="_blank" rel="noopener" className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-sky-600 px-3.5 text-sm font-medium text-white hover:bg-sky-500 md:hidden">
                    <ExternalLink className="size-4" /> {t.open}
                  </a>
                  <a
                    href={href}
                    download={f.pdf}
                    onClick={() => track("manual_downloaded", { manual: m.id, lang })}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 px-3.5 text-sm text-neutral-100 hover:bg-white/10"
                  >
                    <Download className="size-4" /> {t.dl}
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label={`${t.reading}: ${open.title[lang]}`} className="fixed inset-0 z-50 flex flex-col bg-[#050b17]/95 p-3 backdrop-blur sm:p-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <b className="min-w-0 flex-1 truncate text-white">{open.title[lang]}</b>
            <a href={asset(`/manuals/${file(open).pdf}`)} download={file(open).pdf} onClick={() => track("manual_downloaded", { manual: open.id, lang })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/20 px-3.5 text-sm text-neutral-100 hover:bg-white/10">
              <Download className="size-4" /> {t.dl}
            </a>
            <button onClick={() => setOpen(null)} autoFocus className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/10 px-3.5 text-sm text-white hover:bg-white/20">
              <X className="size-4" /> {t.close}
            </button>
          </div>
          <iframe src={asset(`/manuals/${file(open).pdf}`)} title={open.title[lang]} className="min-h-0 w-full flex-1 rounded-xl bg-white" />
        </div>
      )}
    </div>
  );
}

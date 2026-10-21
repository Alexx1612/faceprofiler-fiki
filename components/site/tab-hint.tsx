import { ArrowRight } from "lucide-react";

/** "There is more": a moving arrow above a tab bar, so readers open the other tabs. */
export function TabHint({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-sky-300">
      {text}
      <ArrowRight className="animate-nudge size-5" aria-hidden="true" />
    </span>
  );
}

/** Round button at the right end of a tab bar: opens the next tab, its arrow keeps nudging. */
export function NextArrow({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="Next tab"
      title="Next tab"
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sky-400 text-sky-950 shadow-lg shadow-sky-500/30 transition-transform hover:scale-105"
    >
      <ArrowRight className="animate-nudge size-6" strokeWidth={2.5} />
    </button>
  );
}

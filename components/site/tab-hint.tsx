import { ArrowRight } from "lucide-react";

/** "There is more": a moving arrow next to a tab bar, so readers open the other tabs. */
export function TabHint({ text }: { text: string }) {
  return (
    <span className="jet inline-flex items-center gap-1.5 text-xs text-sky-300">
      {text}
      <ArrowRight className="animate-nudge size-4" aria-hidden="true" />
    </span>
  );
}

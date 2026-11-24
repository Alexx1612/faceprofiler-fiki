"use client";

import { track } from "@/lib/analytics";

/** A plain link that also records a PostHog event on click (no-op when analytics is off). */
export function TrackedLink({
  event,
  props,
  ...rest
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { event: string; props?: Record<string, unknown> }) {
  return <a {...rest} onClick={(e) => { track(event, props); rest.onClick?.(e); }} />;
}

/**
 * PostHog analytics and the lead form endpoint (Milestone 5).
 *
 * Methodology: both keys are public client keys and come from the build environment
 * (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_FORMSPREE_ID`, set in the git-ignored `.env.local`).
 * Without them the site still works: no analytics is loaded and the forms fall back to `mailto:`.
 * posthog-js is imported on demand, so pages pay nothing for it when the key is missing.
 * Consent: `cookieless_mode: "on_reject"` counts visits without cookies until the visitor accepts;
 * "Decline" keeps it cookieless. Session replay masks every input, so typed e-mails never appear.
 */
import type { PostHog } from "posthog-js";

export const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
export const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
export const formspreeId = process.env.NEXT_PUBLIC_FORMSPREE_ID ?? "";
/** Separate Formspree form for the quick survey (its own inbox and CSV); falls back to the main form. */
export const surveyFormId = process.env.NEXT_PUBLIC_FORMSPREE_SURVEY_ID || formspreeId;

let client: PostHog | null = null;
let loading: Promise<PostHog | null> | null = null;
const queue: [string, Record<string, unknown> | undefined][] = [];

/** Load and start PostHog once (browser only). Resolves to null when no key is configured. */
export function initAnalytics(): Promise<PostHog | null> {
  if (!posthogKey || typeof window === "undefined") return Promise.resolve(null);
  loading ??= import("posthog-js").then(({ default: posthog }) => {
    posthog.init(posthogKey, {
      api_host: posthogHost,
      person_profiles: "identified_only",
      cookieless_mode: "on_reject",
      capture_pageview: "history_change",
      capture_pageleave: true,
      session_recording: { maskAllInputs: true },
    });
    client = posthog;
    for (const [e, p] of queue.splice(0)) posthog.capture(e, p);
    return posthog;
  });
  return loading;
}

/** Record an event; queued until PostHog has loaded, ignored when analytics is off. */
export function track(event: string, props?: Record<string, unknown>) {
  if (!posthogKey) return;
  if (client) client.capture(event, props);
  else queue.push([event, props]);
}

export type Consent = "granted" | "denied" | "pending";

export async function consentStatus(): Promise<Consent> {
  const ph = await initAnalytics();
  return ph ? ph.get_explicit_consent_status() : "granted";
}

export async function setConsent(accept: boolean) {
  const ph = await initAnalytics();
  if (!ph) return;
  if (accept) ph.opt_in_capturing();
  else ph.opt_out_capturing();
}

/**
 * Send a lead to Formspree. Returns "sent", "mailto" (no form configured: caller opens the mail app)
 * or throws with a short message the form can show.
 */
export async function sendLead(form: string, data: Record<string, string>, id = formspreeId): Promise<"sent" | "mailto"> {
  if (!id) return "mailto";
  const res = await fetch(`https://formspree.io/f/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ form, page: typeof location === "undefined" ? "" : location.pathname + location.search, ...data }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { errors?: { message?: string }[] };
    throw new Error(body.errors?.[0]?.message || "The form could not be sent. Please try again.");
  }
  return "sent";
}

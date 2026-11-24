/**
 * PostHog analytics and the lead form endpoint (Milestone 5).
 *
 * Methodology: both keys are public client keys and come from the build environment
 * (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_FORMSPREE_ID`, set in the git-ignored `.env.local`).
 * Without them the site still works: no analytics is loaded and the forms fall back to `mailto:`.
 * posthog-js is imported on demand, so pages pay nothing for it when the key is missing.
 * Consent: `cookieless_mode: "on_reject"` counts visits without cookies until the visitor accepts;
 * "Decline" keeps it cookieless. Session replay masks every input, so typed e-mails never appear.
 * Our own collector (lib/collect.ts, NEXT_PUBLIC_COLLECT_URL) runs next to PostHog or on its own: every
 * track() call goes to both, and leads go to the collector first, then Formspree, then mailto.
 */
import type { PostHog } from "posthog-js";

import { collect, collectConsent, collectForm, collectUrl, setCollectConsent, startCollect, testMode } from "@/lib/collect";

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
  if (typeof window !== "undefined") startCollect();
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
    // the owner's own visits: filter them out in PostHog with "is_test" (internal and test users)
    if (testMode()) posthog.register({ is_test: true });
    client = posthog;
    for (const [e, p] of queue.splice(0)) posthog.capture(e, p);
    return posthog;
  });
  return loading;
}

/** Record an event; queued until PostHog has loaded, ignored when analytics is off. */
export function track(event: string, props?: Record<string, unknown>) {
  collect(event, props);
  if (!posthogKey) return;
  if (client) client.capture(event, props);
  else queue.push([event, props]);
}

export type Consent = "granted" | "denied" | "pending";

/** True when any analytics is configured (PostHog or our collector), so the consent bar is needed. */
export const analyticsOn = Boolean(posthogKey || collectUrl);

export async function consentStatus(): Promise<Consent> {
  const ph = await initAnalytics();
  const own = collectConsent();
  if (own !== "pending") return own;
  return ph ? ph.get_explicit_consent_status() : collectUrl ? "pending" : "granted";
}

export async function setConsent(accept: boolean) {
  setCollectConsent(accept);
  const ph = await initAnalytics();
  if (!ph) return;
  if (accept) ph.opt_in_capturing();
  else ph.opt_out_capturing();
}

/**
 * Send a lead: to our collector when configured (and also to Formspree, for its e-mail alert, when an ID
 * is set), else to Formspree, else return "mailto" so the caller opens the mail app. Throws with a short
 * message the form can show when Formspree refuses.
 */
export async function sendLead(form: string, data: Record<string, string>, id = formspreeId): Promise<"sent" | "mailto"> {
  if (collectUrl) {
    await collectForm(form, data);
    if (id) await postFormspree(form, data, id).catch(() => {});
    return "sent";
  }
  if (!id) return "mailto";
  await postFormspree(form, data, id);
  return "sent";
}

async function postFormspree(form: string, data: Record<string, string>, id: string) {
  const res = await fetch(`https://formspree.io/f/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      form,
      page: typeof location === "undefined" ? "" : location.pathname + location.search,
      ...(testMode() ? { test: "true" } : {}),
      ...data,
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { errors?: { message?: string }[] };
    throw new Error(body.errors?.[0]?.message || "The form could not be sent. Please try again.");
  }
}

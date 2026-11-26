"use client";

/**
 * Who is signed in on this tab: one Google account shared by the pilot form, the analytics owner view and
 * the account pill in the top bars.
 *
 * Methodology: the Google ID token is kept in sessionStorage for this tab only (it expires after about an
 * hour) and is decoded only for display (lib/google-auth.ts readIdToken); the collector verifies it before
 * it trusts the e-mail. A window event tells every mounted component when the account changes, so signing
 * in on the pilot form also updates the pill and the analytics page, and signing out anywhere signs out
 * everywhere. No account = guest: guests see the whole site except the owner's analytics, and need a
 * Google sign-in (or an e-mail) only to book a pilot.
 */
import { useEffect, useState } from "react";

import { readIdToken, type GoogleUser } from "@/lib/google-auth";

const KEY = "nauino:owner"; // name kept so tabs signed in before this change stay signed in
const EVENT = "nauino:account";

function expired(credential: string): boolean {
  try {
    const payload = JSON.parse(atob(credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

/** The signed-in account of this tab, or null for a guest. */
export function getAccount(): GoogleUser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw || expired(raw)) return null;
    return readIdToken(raw);
  } catch {
    return null;
  }
}

export function setAccount(u: GoogleUser | null) {
  try {
    if (u) sessionStorage.setItem(KEY, u.credential);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the event below still updates this page */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: u }));
}

/** The current account, kept in sync across components; null before mount and for guests. */
export function useAccount(): GoogleUser | null {
  const [user, setUser] = useState<GoogleUser | null>(null);
  useEffect(() => {
    setUser(getAccount());
    const on = (e: Event) => setUser((e as CustomEvent<GoogleUser | null>).detail ?? null);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return user;
}

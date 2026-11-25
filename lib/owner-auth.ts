"use client";

/**
 * Owner sign-in for private analytics views (session replays, the form inbox).
 *
 * Methodology: reuses the Google sign-in client of the pilot form (lib/google-auth.ts). The ID token is kept
 * in memory and sessionStorage for this tab only (it expires after about an hour) and is sent to the
 * collector as `token=` on private requests; the collector (collector/Owner.gs) decides who is an owner, so
 * nothing private is ever in the page itself. `ownerFetch(params)` calls the collector's GET endpoint with
 * the token and returns its JSON, or `{ ok: false, error }`.
 */
import { useCallback, useEffect, useState } from "react";

import { collectUrl } from "@/lib/collect";
import { readIdToken, type GoogleUser } from "@/lib/google-auth";

const KEY = "nauino:owner";

function load(): GoogleUser | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const u = raw ? readIdToken(raw) : null;
    return u && !expired(raw!) ? u : null;
  } catch {
    return null;
  }
}

function expired(credential: string): boolean {
  try {
    const payload = JSON.parse(atob(credential.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return !payload.exp || payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

/** Signed-in owner candidate (the collector still decides), with sign-in / sign-out. */
export function useOwner() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  useEffect(() => setUser(load()), []);
  const signIn = useCallback((u: GoogleUser) => {
    try {
      sessionStorage.setItem(KEY, u.credential);
    } catch {
      /* memory only */
    }
    setUser(u);
  }, []);
  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing stored */
    }
    setUser(null);
  }, []);
  return { user, token: user?.credential ?? "", signIn, signOut };
}

/** GET the collector with the owner's token: ownerFetch(token, { replays: "list" }). */
export async function ownerFetch<T = unknown>(token: string, params: Record<string, string>): Promise<T | { ok: false; error: string }> {
  if (!collectUrl) return { ok: false, error: "collector not configured" };
  if (!token) return { ok: false, error: "not signed in" };
  const q = new URLSearchParams({ ...params, token });
  try {
    const res = await fetch(`${collectUrl}?${q}`);
    return (await res.json()) as T;
  } catch {
    return { ok: false, error: "collector unreachable" };
  }
}

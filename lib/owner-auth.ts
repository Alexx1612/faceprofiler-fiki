"use client";

/**
 * Owner sign-in for private analytics views (session replays, the form inbox).
 *
 * Methodology: reuses the Google sign-in client of the pilot form (lib/google-auth.ts). The ID token is kept
 * for this tab only by lib/account.ts (it expires after about an hour) and is sent to the
 * collector as `token=` on private requests; the collector (collector/Owner.gs) decides who is an owner, so
 * nothing private is ever in the page itself. `ownerFetch(params)` calls the collector's GET endpoint with
 * the token and returns its JSON, or `{ ok: false, error }`.
 */
import { useCallback } from "react";

import { setAccount, useAccount } from "@/lib/account";
import { collectUrl, markTestAccount, setTestMode } from "@/lib/collect";
import { type GoogleUser } from "@/lib/google-auth";

/** Signed-in owner candidate (the collector still decides), with sign-in / sign-out. Shares the tab's account (lib/account.ts). */
export function useOwner() {
  const user = useAccount();
  const signIn = useCallback((u: GoogleUser) => {
    setAccount(u);
    // the owner's own visits are always test traffic, whichever browser they sign in from
    setTestMode(true);
    void markTestAccount(u.email);
  }, []);
  const signOut = useCallback(() => setAccount(null), []);
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

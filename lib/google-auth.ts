/**
 * Google sign-in for the pilot request (Google Identity Services, "Sign in with Google" button).
 *
 * Methodology: the GIS script (accounts.google.com/gsi/client) is loaded only when the pilot section
 * needs it and only when `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set. Google hands back an ID token (a signed
 * JWT). The page decodes it only to show "Signed in as …"; it is never trusted here. The token goes with
 * the pilot request to the collector (collector/Pilot.gs), which verifies it with Google before it uses the
 * e-mail. One Tap and auto-select are off: nobody is signed in without pressing the button. The token stays
 * in this tab only (sessionStorage, lib/account.ts) until it expires or the visitor signs out.
 */

export const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export type GoogleUser = { name: string; email: string; picture: string; credential: string };

type IdConfig = { client_id: string; callback: (r: { credential: string }) => void; auto_select?: boolean; cancel_on_tap_outside?: boolean; use_fedcm_for_button?: boolean };
type ButtonConfig = { type?: "standard"; theme?: "outline" | "filled_blue" | "filled_black"; size?: "large"; shape?: "pill" | "rectangular"; text?: "signin_with" | "continue_with"; width?: number; logo_alignment?: "left" | "center"; locale?: string };
export type GoogleId = {
  initialize: (c: IdConfig) => void;
  renderButton: (el: HTMLElement, c: ButtonConfig) => void;
  disableAutoSelect: () => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } };
  }
}

let loading: Promise<GoogleId | null> | null = null;

/** Load the GIS script once; resolves null when it cannot load (blocked, offline) within `timeoutMs`. */
export function loadGoogleId(timeoutMs = 8000): Promise<GoogleId | null> {
  if (typeof window === "undefined" || !googleClientId) return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  loading ??= new Promise<GoogleId | null>((resolve) => {
    const done = (v: GoogleId | null) => {
      clearTimeout(timer);
      if (!v) loading = null; // allow a retry later
      resolve(v);
    };
    const timer = setTimeout(() => done(null), timeoutMs);
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => done(window.google?.accounts?.id ?? null);
    s.onerror = () => done(null);
    document.head.appendChild(s);
  });
  return loading;
}

/** Read the claims of an ID token for display only (the collector verifies the token with Google). */
export function readIdToken(credential: string): GoogleUser | null {
  try {
    const part = credential.split(".")[1];
    const json = decodeURIComponent(
      atob(part.replace(/-/g, "+").replace(/_/g, "/"))
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const p = JSON.parse(json) as { email?: string; name?: string; picture?: string; exp?: number };
    if (!p.email || (p.exp && p.exp * 1000 < Date.now())) return null;
    return { email: p.email, name: p.name ?? p.email, picture: p.picture ?? "", credential };
  } catch {
    return null;
  }
}

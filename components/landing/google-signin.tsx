"use client";

import { useEffect, useRef } from "react";

import { googleClientId, loadGoogleId, readIdToken, type GoogleUser } from "@/lib/google-auth";

/**
 * The official "Sign in with Google" button (rendered by Google Identity Services into a div).
 * Calls `onUser` with the signed-in user, or `onUnavailable` when there is no client ID or the Google
 * script cannot load (blocked, offline), so the caller can fall back to a plain e-mail field.
 */
export function GoogleSignIn({ onUser, onUnavailable }: { onUser: (u: GoogleUser) => void; onUnavailable: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef({ onUser, onUnavailable });
  useEffect(() => {
    cb.current = { onUser, onUnavailable };
  }, [onUser, onUnavailable]);

  useEffect(() => {
    let alive = true;
    loadGoogleId().then((id) => {
      if (!alive) return;
      if (!id || !box.current) return cb.current.onUnavailable();
      id.initialize({
        client_id: googleClientId,
        auto_select: false,
        cancel_on_tap_outside: true,
        callback: (r) => {
          const u = readIdToken(r.credential);
          if (u) cb.current.onUser(u);
        },
      });
      const width = Math.min(360, Math.max(240, Math.floor(box.current.getBoundingClientRect().width || 320)));
      id.renderButton(box.current, { type: "standard", theme: "filled_black", size: "large", shape: "pill", text: "continue_with", logo_alignment: "left", width });
    });
    return () => {
      alive = false;
    };
  }, []);

  return <div ref={box} className="lp-gsi" aria-label="Sign in with Google" />;
}

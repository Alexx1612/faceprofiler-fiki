"use client";

import { useState } from "react";

import { GoogleSignIn } from "@/components/landing/google-signin";
import { sendLead, track } from "@/lib/analytics";
import { collectForm, collectUrl, markTestAccount } from "@/lib/collect";
import { asset, team } from "@/lib/content";
import { googleClientId, loadGoogleId, type GoogleUser } from "@/lib/google-auth";

/**
 * "Book a free 30-day pilot": sign in with Google, then school, role, an optional phone call and consent.
 *
 * Methodology: with Google sign-in the e-mail comes from Google, not from a text field; the ID token goes
 * with the request to our collector, which verifies it with Google (collector/Pilot.gs) and e-mails the
 * team. Without a client ID, or when the Google script is blocked, the same form asks for the e-mail
 * instead, so the page never has a dead end. Without a collector the request goes to Formspree or the
 * visitor's e-mail app (sendLead). Analytics only get `pilot_requested` with non-personal fields: never
 * the e-mail, the phone or the school.
 */
export function PilotForm() {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [google, setGoogle] = useState<"loading" | "off">(googleClientId ? "loading" : "off");
  const [call, setCall] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const signOut = () => {
    setUser(null);
    loadGoogleId().then((id) => id?.disableAutoSelect());
    track("pilot_signed_out");
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("_gotcha")) return;
    const v = (k: string) => String(fd.get(k) ?? "").trim();
    const data: Record<string, string> = {
      school: v("school"),
      role: v("role"),
      call: call ? "yes" : "no",
      ...(call ? { phone: v("phone"), call_time: v("call_time") } : {}),
      email: user ? user.email : v("email"),
      name: user ? user.name : "",
      signin: user ? "google" : "email",
      consent: "yes",
    };
    setState("sending");
    try {
      let via = "collector";
      if (collectUrl) await collectForm("pilot", user ? { ...data, id_token: user.credential } : data);
      else via = await sendLead("pilot", data);
      track("pilot_requested", { role: data.role || "not given", call: data.call, signin: data.signin, via });
      if (via === "mailto") {
        const body = [`School: ${data.school}`, `Role: ${data.role}`, `E-mail: ${data.email}`, `Phone call: ${data.call}${call ? ` (${data.phone}, ${data.call_time})` : ""}`].join("\n");
        window.location.href = `mailto:${team[1].email}?subject=${encodeURIComponent("Nau-ino pilot request")}&body=${encodeURIComponent(body)}`;
        setMsg("Your e-mail app should open now. Press send there to book the pilot.");
      } else {
        setMsg("Request sent. We'll e-mail you within 2 working days.");
        form.reset();
        setCall(false);
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "The request could not be sent. Please try again.");
    }
  };

  if (state === "sent")
    return (
      <div className="lp-pilotbox lp-pilotbox--done" role="status">
        <span className="lp-pilotbox__tick" aria-hidden>
          ✓
        </span>
        <p className="lp-pilotbox__done">{msg}</p>
        {user && <p className="lp-form__note">Sent as {user.email}</p>}
      </div>
    );

  const showForm = Boolean(user) || google === "off";

  return (
    <div className="lp-pilotbox">
      {!user && google === "loading" && (
        <div className="lp-pilotbox__signin">
          <GoogleSignIn
            onUser={(u) => {
              setUser(u);
              void markTestAccount(u.email); // the team's own accounts count as test traffic
              track("pilot_signed_in", { with: "google" });
            }}
            onUnavailable={() => setGoogle("off")}
          />
          <p className="lp-form__note">We only read your name and e-mail. Nothing is posted to your account.</p>
        </div>
      )}

      {user && (
        <p className="lp-pilotbox__who">
          {user.picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.picture} alt="" width={28} height={28} referrerPolicy="no-referrer" />
          ) : null}
          <span>
            Signed in as <b>{user.name}</b> · {user.email}
          </span>
          <button type="button" className="lp-linkbtn" onClick={signOut}>
            Not you? Sign out
          </button>
        </p>
      )}

      {showForm && (
        <form className="lp-form lp-pilotbox__form" onSubmit={submit} aria-label="Book a pilot">
          {!user && (
            <>
              {googleClientId && <p className="lp-form__note">Google sign-in is not available here, so tell us your e-mail instead.</p>}
              <label>
                Your e-mail
                <input name="email" type="email" required autoComplete="email" placeholder="name@school.ro" />
              </label>
            </>
          )}
          <div className="lp-form__two">
            <label>
              School or organisation
              <input name="school" required autoComplete="organization" placeholder="School no. 7, Cluj" />
            </label>
            <label>
              Your role
              <select name="role" defaultValue="">
                <option value="">Choose one</option>
                <option>Principal or director</option>
                <option>Administrator</option>
                <option>Teacher</option>
                <option>Security or IT</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          <label className="lp-form__check">
            <input type="checkbox" name="call" checked={call} onChange={(e) => setCall(e.target.checked)} />
            <span>I&apos;d like a phone call</span>
          </label>
          {call && (
            <div className="lp-form__two">
              <label>
                Phone
                <input name="phone" type="tel" required autoComplete="tel" placeholder="07xx xxx xxx" pattern="[0-9+ ]{7,20}" />
              </label>
              <label>
                Best time
                <select name="call_time" defaultValue="Morning">
                  <option>Morning</option>
                  <option>Afternoon</option>
                </select>
              </label>
            </div>
          )}
          <label className="lp-form__check">
            <input type="checkbox" name="consent" required />
            <span>
              I agree that Nau-ino may contact me about this pilot. My details are used only for that and never shared (
              <a href={asset("/privacy/")} target="_blank" rel="noreferrer">
                privacy
              </a>
              ).
            </span>
          </label>
          <input name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-hp" />
          <button type="submit" className="lp-btn" disabled={state === "sending"}>
            {state === "sending" ? "Sending…" : "Book my pilot"}
          </button>
          {state === "error" && (
            <p className="lp-form__note lp-form__note--error" role="alert">
              {msg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

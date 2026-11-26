"use client";

import { useState } from "react";

import { setAccount, useAccount } from "@/lib/account";
import { GoogleSignIn } from "@/components/landing/google-signin";
import { sendLead, track } from "@/lib/analytics";
import { collectForm, collectUrl, markTestAccount } from "@/lib/collect";
import { asset, team } from "@/lib/content";
import { googleClientId, loadGoogleId, type GoogleUser } from "@/lib/google-auth";

/**
 * "Subscribe to the newsletter (to be invited for a pilot)": the only sign-up on the landing page. Continue with Google, or leave an e-mail and/or a phone
 * number (at least one), plus consent; school and role are optional.
 *
 * Methodology: with Google sign-in the e-mail comes from Google, not from a text field; the ID token goes
 * with the request to our collector, which verifies it with Google (collector/Pilot.gs) and e-mails the
 * team. Without Google the visitor types an e-mail, a phone number or both; a phone number means "call me"
 * (with the best time). When the Google script is blocked the form simply has no Google button. Without a
 * collector the request goes to Formspree or the visitor's e-mail app (sendLead). Analytics only get
 * `pilot_requested` with non-personal fields: never the e-mail, the phone or the school. The account is the
 * tab's shared one (lib/account.ts).
 */
export function PilotForm() {
  const user = useAccount(); // already signed in on this tab (pilot form or analytics) = no button again
  const setUser = (u: GoogleUser | null) => setAccount(u);
  const [google, setGoogle] = useState<"loading" | "off">(googleClientId ? "loading" : "off");
  const [phone, setPhone] = useState("");
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
    const email = user ? user.email : v("email");
    const tel = v("phone");
    if (!email && !tel) {
      setState("error");
      setMsg("Leave an e-mail or a phone number, so we can reach you.");
      return;
    }
    const data: Record<string, string> = {
      school: v("school"),
      role: v("role"),
      call: tel ? "yes" : "no",
      ...(tel ? { phone: tel, call_time: v("call_time") } : {}),
      email,
      name: user ? user.name : "",
      signin: user ? "google" : email ? "email" : "phone",
      consent: "yes",
    };
    setState("sending");
    try {
      let via = "collector";
      if (collectUrl) await collectForm("pilot", user ? { ...data, id_token: user.credential } : data);
      else via = await sendLead("pilot", data);
      track("pilot_requested", { role: data.role || "not given", call: data.call, signin: data.signin, via });
      if (via === "mailto") {
        const body = [`School: ${data.school}`, `Role: ${data.role}`, `E-mail: ${data.email || "-"}`, `Phone: ${tel ? `${tel} (${data.call_time})` : "-"}`].join("\n");
        window.location.href = `mailto:${team[1].email}?subject=${encodeURIComponent("Nau-ino newsletter and pilot invitation")}&body=${encodeURIComponent(body)}`;
        setMsg("Your e-mail app should open now. Press send there to subscribe.");
      } else {
        setMsg(tel && !email ? "You're subscribed. We'll call you when a pilot opens near you." : "You're subscribed. We'll invite you when a pilot opens near you.");
        form.reset();
        setPhone("");
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
          <p className="lp-pilotbox__or">
            <span>or leave your e-mail or phone</span>
          </p>
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

      <form className="lp-form lp-pilotbox__form" onSubmit={submit} aria-label="Subscribe to the newsletter">
        <p className="lp-form__group">{user ? "Phone, if you want a call" : "How we reach you"}</p>
        <div className="lp-form__two">
          {!user && (
            <label>
              E-mail
              <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
            </label>
          )}
          <label>
            <span>
              Phone {user ? <span className="lp-form__opt">(optional)</span> : null}
            </span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="07xx xxx xxx"
              pattern="[0-9+()\-. ]{7,20}"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
        {!user && <p className="lp-form__note">One of the two is enough. With a phone number we call you.</p>}
        {phone.trim() && (
          <label>
            Best time to call
            <select name="call_time" defaultValue="Morning">
              <option>Morning</option>
              <option>Afternoon</option>
            </select>
          </label>
        )}
        <p className="lp-form__group">
          About you <span className="lp-form__opt">· optional</span>
        </p>
        <div className="lp-form__two">
          <label>
            <span>School or organisation</span>
            <input name="school" autoComplete="organization" placeholder="School no. 7, Cluj" />
          </label>
          <label>
            <span>Your role</span>
            <select name="role" defaultValue="">
              <option value="">Prefer not to say</option>
              <option>Principal or director</option>
              <option>Administrator</option>
              <option>Teacher</option>
              <option>Parent</option>
              <option>Security or IT</option>
              <option>Other</option>
            </select>
          </label>
        </div>
        <label className="lp-form__check">
          <input type="checkbox" name="consent" required />
          <span>
            I agree that Nau-ino may e-mail or call me with news and a pilot invitation. My details are used only for that and never shared (
            <a href={asset("/privacy/")} target="_blank" rel="noreferrer">
              privacy
            </a>
            ).
          </span>
        </label>
        <input name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-hp" />
        <button type="submit" className="lp-btn" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Subscribe"}
        </button>
        {state === "error" && (
          <p className="lp-form__note lp-form__note--error" role="alert">
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}

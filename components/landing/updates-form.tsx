"use client";

import { useState } from "react";

import { sendLead, track } from "@/lib/analytics";
import { team } from "@/lib/content";

/**
 * "Get launch updates" sign-up (Milestone 5 lead collection).
 *
 * Methodology: sends e-mail, optional phone and role to Formspree when a form ID is configured;
 * otherwise opens the visitor's e-mail app with the same fields (like the pilot form), so the page never
 * has a dead button. `_gotcha` is Formspree's honeypot: bots fill it, people never see it.
 */
export function UpdatesForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("Only the team sees this. One e-mail when the pilot opens, unsubscribe any time.");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("_gotcha")) return;
    const data = { email: String(fd.get("email") ?? ""), phone: String(fd.get("phone") ?? ""), role: String(fd.get("role") ?? "") };
    setState("sending");
    try {
      const how = await sendLead("updates", data);
      track("updates_form_submitted", { role: data.role, with_phone: Boolean(data.phone), via: how });
      if (how === "mailto") {
        const body = [`E-mail: ${data.email}`, `Phone: ${data.phone}`, `Role: ${data.role}`].join("\n");
        window.location.href = `mailto:${team[1].email}?subject=${encodeURIComponent("Nau-ino launch updates")}&body=${encodeURIComponent(body)}`;
        setMsg("Your e-mail app should open now. Press send there to sign up.");
      } else {
        setMsg("Thank you. You are on the list.");
        form.reset();
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "The form could not be sent. Please try again.");
    }
  };

  return (
    <form className="lp-glass lp-form" onSubmit={submit} aria-label="Get launch updates">
      <label>
        E-mail
        <input name="email" type="email" required autoComplete="email" placeholder="name@school.ro" />
      </label>
      <div className="lp-form__two">
        <label>
          Phone (optional)
          <input name="phone" type="tel" autoComplete="tel" placeholder="07xx xxx xxx" />
        </label>
        <label>
          I am
          <select name="role" defaultValue="" required>
            <option value="" disabled>
              Choose one
            </option>
            <option>Parent</option>
            <option>Teacher</option>
            <option>School staff or director</option>
            <option>Security or IT</option>
            <option>Other</option>
          </select>
        </label>
      </div>
      <input name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-hp" />
      <label className="lp-form__check">
        <input name="consent" type="checkbox" required />
        <span>I agree that Nau-ino may e-mail me about the pilot and launch. My details are not shared.</span>
      </label>
      <button type="submit" className="lp-btn" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Keep me updated"}
      </button>
      <p className={state === "error" ? "lp-form__note lp-form__note--error" : "lp-form__note"} role="status">
        {msg}
      </p>
    </form>
  );
}

"use client";

import { useState } from "react";

import { sendLead, track } from "@/lib/analytics";
import { team } from "@/lib/content";

/**
 * "Get notified" sign-up (Milestone 5 lead collection): e-mail, an optional role, one button.
 * Event names stay `updates_form_submitted` so the PostHog funnel and the collector's funnel keep working.
 */
export function UpdatesForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("Unsubscribe any time.");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    if (fd.get("_gotcha")) return;
    const data = { email: String(fd.get("email") ?? ""), role: String(fd.get("role") ?? "") };
    setState("sending");
    try {
      const how = await sendLead("updates", data);
      track("updates_form_submitted", { role: data.role || "not given", via: how });
      if (how === "mailto") {
        window.location.href = `mailto:${team[1].email}?subject=${encodeURIComponent("Nau-ino launch updates")}&body=${encodeURIComponent(`E-mail: ${data.email}\nRole: ${data.role}`)}`;
        setMsg("Your e-mail app should open now. Press send there to sign up.");
      } else {
        setMsg("Thank you. We will write once, when the pilot opens.");
        form.reset();
      }
      setState("sent");
    } catch (err) {
      setState("error");
      setMsg(err instanceof Error ? err.message : "The form could not be sent. Please try again.");
    }
  };

  return (
    <form className="lp-notify" onSubmit={submit} aria-label="Get notified when Nau-ino launches">
      <div className="lp-notify__row">
        <label className="lp-notify__field">
          <span className="sr-only">E-mail</span>
          <input name="email" type="email" required autoComplete="email" placeholder="you@email.com" />
        </label>
        <label className="lp-notify__field">
          <span className="sr-only">I am (optional)</span>
          <select name="role" defaultValue="">
            <option value="">I am… (optional)</option>
            <option>Parent</option>
            <option>Teacher</option>
            <option>School staff or director</option>
            <option>Security or IT</option>
            <option>Other</option>
          </select>
        </label>
        <input name="_gotcha" tabIndex={-1} autoComplete="off" aria-hidden="true" className="lp-hp" />
        <button type="submit" className="lp-btn" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : state === "sent" ? "You're on the list ✓" : "Get notified"}
        </button>
      </div>
      <p className={state === "error" ? "lp-form__note lp-form__note--error" : "lp-form__note"} role="status">
        {msg}
      </p>
    </form>
  );
}

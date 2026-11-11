"use client";

import { useState } from "react";

import { team } from "@/lib/content";

/**
 * Pilot booking form. The site is static, so it opens the visitor's e-mail app with the answers filled in,
 * addressed to the team member who runs pilots (same approach as the M2 questionnaire).
 */
export function PilotForm() {
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((v) => ({ ...v, [k]: e.target.value }));
  const to = team[1].email;

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const body = [`School: ${f.school ?? ""}`, `Town: ${f.town ?? ""}`, `My role: ${f.role ?? ""}`, `Cameras: ${f.cameras ?? ""}`].join("\n");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent("Nau-ino pilot request")}&body=${encodeURIComponent(body)}`;
  };

  return (
    <form className="lp-glass lp-form" onSubmit={send}>
      <label>
        School
        <input required autoComplete="organization" onChange={set("school")} />
      </label>
      <div className="lp-form__two">
        <label>
          Town
          <input autoComplete="address-level2" onChange={set("town")} />
        </label>
        <label>
          Your role
          <input placeholder="Director, administrator" onChange={set("role")} />
        </label>
      </div>
      <label>
        Cameras on site
        <select defaultValue="" onChange={set("cameras")}>
          <option value="" disabled>
            Choose one
          </option>
          <option>1 to 5</option>
          <option>6 to 15</option>
          <option>16 to 40</option>
          <option>More than 40</option>
          <option>Not sure</option>
        </select>
      </label>
      <button type="submit" className="lp-btn">
        Book a pilot
      </button>
      <p className="lp-form__note">Opens your e-mail app with this filled in. Nothing is stored on this site.</p>
    </form>
  );
}

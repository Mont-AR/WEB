"use client";

import { useState, type FormEvent } from "react";
import { projectContent, serviceLabel, servicesContent, startingContent } from "@/lib/content";

export const services = servicesContent.list;
export const startingPoints = startingContent.list;

function ChoiceIcon({ kind }: { kind: string }) {
  const common = { viewBox: "0 0 64 64", fill: "none", stroke: "currentColor", strokeWidth: 4, strokeLinejoin: "miter" as const, "aria-hidden": true as const };
  if (kind === "web" || kind === "Crear") return <svg {...common}><path d="M7 9h50v46H7zM7 19h50M15 14h3m5 0h3m5 0h3M15 28h18v19H15zM38 29h11M38 37h11M38 45h8"/></svg>;
  if (kind === "wordpress") return <svg {...common}><circle cx="32" cy="32" r="27"/><path d="m13 23 9 24 10-25 10 25 9-24M27 22h11"/></svg>;
  if (kind === "automatización") return <svg {...common}><path d="M27 6h10l2 7 6 3 7-3 6 9-5 5 1 7 6 4-5 9-7-2-6 4-1 8H27l-1-8-6-4-7 2-5-9 6-4 1-7-5-5 5-9 7 3 6-3z"/><circle cx="32" cy="32" r="9"/></svg>;
  if (kind === "sistemas de gestión") return <svg {...common}><ellipse cx="32" cy="13" rx="22" ry="7"/><path d="M10 13v14c0 4 10 7 22 7s22-3 22-7V13M10 27v14c0 4 10 7 22 7s22-3 22-7V27M10 41v10c0 4 10 7 22 7s22-3 22-7V41"/></svg>;
  if (kind === "bots") return <svg {...common}><path d="M14 23h36v30H14zM32 23V11m-5 0h10M8 34h6m36 0h6M20 53v5m24-5v5"/><rect x="21" y="32" width="6" height="6" fill="currentColor"/><rect x="37" y="32" width="6" height="6" fill="currentColor"/><path d="M23 45h18"/></svg>;
  if (kind === "google workspace") return <svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><path d="M9 50V14l23 19 23-19v36" stroke="#53d7f5" strokeWidth="9"/><path d="M9 14 32 33 55 14" stroke="#f46761" strokeWidth="9"/><path d="M55 23v27" stroke="#60d181" strokeWidth="9"/><path d="M9 23v27" stroke="#4789ef" strokeWidth="9"/></svg>;
  if (kind === "Conectar y automatizar") return <svg {...common}><path d="M29 8h8v10h-8zM7 46h10v10H7zM47 46h10v10H47zM33 18v13M12 46V34h40v12M33 31 12 46m21-15 19 15"/></svg>;
  return <svg {...common}><path d="M4 51 23 25l8 8 14-22 15 40M24 48l7-13 8 13M10 56h44M49 10v15M49 10l9 4-9 4"/></svg>;
}

function ChoiceArrow() {
  return <svg className="choice-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 10h15m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2"/></svg>;
}

export function ServicesPanel({ selected, onChoose }: { selected: string; onChoose: (value: string) => void }) {
  return <section className="content-panel services-panel" aria-labelledby="services-title">
    <p className="panel-kicker">01 / {servicesContent.navLabel}</p>
    <h2 id="services-title">{servicesContent.title}</h2>
    <p className="panel-lead">{servicesContent.descripcion}</p>
    <div className="choices services-grid">
      {services.map((value) => <button key={value} className={`choice-card ${selected === value ? "is-selected" : ""}`} type="button" onClick={() => onChoose(value)} aria-pressed={selected === value}>
        <span className="choice-icon"><ChoiceIcon kind={value}/></span><span className="choice-title">{serviceLabel(value)}</span><ChoiceArrow/>
      </button>)}
    </div>
    <p className="panel-examples">{servicesContent.examples}</p>
  </section>;
}

export function StartingPanel({ selected, onChoose }: { selected: string; onChoose: (value: string) => void }) {
  return <section className="content-panel starting-panel" aria-labelledby="starting-title">
    <p className="panel-kicker">02 / {startingContent.navLabel}</p>
    <h2 id="starting-title">{startingContent.title}</h2>
    <p className="panel-lead">{startingContent.descripcion}</p>
    <div className="choices starting-grid">
      {startingPoints.map((item) => <button key={item.title} className={`choice-card ${selected === item.title ? "is-selected" : ""}`} type="button" onClick={() => onChoose(item.title)} aria-pressed={selected === item.title}>
        <span className="choice-icon"><ChoiceIcon kind={item.title}/></span><span className="choice-title">{item.title}</span><span className="choice-description">{item.description}</span><ChoiceArrow/>
      </button>)}
    </div>
  </section>;
}

export function ProjectPanel({ service, startingPoint, onServiceChange, onStartingPointChange }: {
  service: string;
  startingPoint: string;
  onServiceChange: (value: string) => void;
  onStartingPointChange: (value: string) => void;
}) {
  const [contactMethod, setContactMethod] = useState<"email" | "telefono">("email");
  const [contactValue, setContactValue] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formCopy = projectContent.form;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const website = String(new FormData(event.currentTarget).get("website") ?? "");
    setIsSubmitting(true);
    setStatus("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactMethod, contactValue: contactValue.trim(), service, startingPoint, description: description.trim(), website }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? formCopy.error);
      setStatus(formCopy.success);
      setDescription("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : formCopy.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <section className="content-panel project-panel" aria-labelledby="project-title">
    <p className="panel-kicker">03 / {projectContent.navLabel}</p>
    <h2 id="project-title">{projectContent.title}</h2>
    <p className="panel-lead">{projectContent.descripcion}</p>
    <form className="project-form" onSubmit={submit}>
      <label htmlFor="contact-method">{formCopy.contactMethod}</label>
      <div className="contact-fields">
        <select id="contact-method" value={contactMethod} onChange={(event) => { setContactMethod(event.target.value as "email" | "telefono"); setContactValue(""); }}>
          <option value="email">{formCopy.email}</option><option value="telefono">{formCopy.phone}</option>
        </select>
        <input aria-label={contactMethod === "email" ? formCopy.email : formCopy.phone} type={contactMethod === "email" ? "email" : "tel"} value={contactValue} onChange={(event) => setContactValue(event.target.value)} autoComplete={contactMethod === "email" ? "email" : "tel"} placeholder={contactMethod === "email" ? formCopy.emailPlaceholder : formCopy.phonePlaceholder} required />
      </div>
      <label htmlFor="service-select">{formCopy.service}</label>
      <select id="service-select" value={service} onChange={(event) => onServiceChange(event.target.value)} required>
        <option value="" disabled>{formCopy.choose}</option>{services.map((value) => <option key={value} value={value}>{serviceLabel(value)}</option>)}
      </select>
      <label htmlFor="starting-select">{formCopy.startingPoint}</label>
      <select id="starting-select" value={startingPoint} onChange={(event) => onStartingPointChange(event.target.value)} required>
        <option value="" disabled>{formCopy.choose}</option>{startingPoints.map((item) => <option key={item.title} value={item.title}>{item.title}</option>)}
      </select>
      <label htmlFor="description">{formCopy.description}</label>
      <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={formCopy.descriptionPlaceholder} rows={4} minLength={10} maxLength={3000} required />
      <div className="sr-only" aria-hidden="true"><label htmlFor="website">No completar</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <button className="hero-button form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? formCopy.submitting : formCopy.submit} <ChoiceArrow/></button>
      {status && <p className="form-status" role="status">{status}</p>}
    </form>
  </section>;
}

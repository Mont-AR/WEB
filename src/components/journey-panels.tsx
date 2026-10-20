"use client";

import { useState, type FormEvent } from "react";
import { projectContent, serviceLabel, servicesContent, startingContent } from "@/lib/content";

export const services = servicesContent.list;
export const startingPoints = startingContent.list;

const cardIconByChoice: Record<string, string> = {
  "web personalizada": "/card-icons/web.png",
  wordpress: "/card-icons/wordpress.png",
  "automatización": "/card-icons/automatizacion.png",
  "sistemas de gestión": "/card-icons/sistemas-de-gestion.png",
  bots: "/card-icons/bots.png",
  "google workspace": "/card-icons/google-workspace.png",
  Crear: "/card-icons/crear.png",
  "Conectar y automatizar": "/card-icons/conectar-y-automatizar.png",
  "Destrabar y mejorar": "/card-icons/destrabar-y-mejorar.png",
};

function ChoiceIcon({ kind }: { kind: string }) {
  const src = cardIconByChoice[kind];
  return src ? <img src={src} alt="" draggable={false} decoding="async" /> : null;
}

function ChoiceArrow() {
  return <svg className="choice-arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 10h15m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2"/></svg>;
}

export function ServicesPanel({ kicker, selected, onChoose }: { kicker: string; selected: string; onChoose: (value: string) => void }) {
  return <section className="content-panel services-panel" aria-labelledby="services-title">
    <p className="panel-kicker">{kicker}</p>
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

export function StartingPanel({ kicker, selected, onChoose }: { kicker: string; selected: string; onChoose: (value: string) => void }) {
  return <section className="content-panel starting-panel" aria-labelledby="starting-title">
    <p className="panel-kicker">{kicker}</p>
    <h2 id="starting-title">{startingContent.title}</h2>
    <p className="panel-lead">{startingContent.descripcion}</p>
    <div className="choices starting-grid">
      {startingPoints.map((item) => <button key={item.title} className={`choice-card ${selected === item.title ? "is-selected" : ""}`} type="button" onClick={() => onChoose(item.title)} aria-pressed={selected === item.title}>
        <span className="choice-icon"><ChoiceIcon kind={item.title}/></span><span className="choice-title">{item.title}</span><span className="choice-description">{item.description}</span><ChoiceArrow/>
      </button>)}
    </div>
  </section>;
}

export function ProjectPanel({ kicker, service, startingPoint, onServiceChange, onStartingPointChange }: {
  kicker: string;
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
    <p className="panel-kicker">{kicker}</p>
    <h2 id="project-title">{projectContent.title}</h2>
    <p className="panel-lead">{projectContent.descripcion}</p>
    <form className="project-form" onSubmit={submit}>
      <div className="form-col">
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
      </div>
      <div className="form-col">
        <label htmlFor="description">{formCopy.description}</label>
        <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder={formCopy.descriptionPlaceholder} rows={4} minLength={10} maxLength={3000} required />
        <button className="hero-button form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? formCopy.submitting : formCopy.submit} <ChoiceArrow/></button>
      </div>
      <div className="sr-only" aria-hidden="true"><label htmlFor="website">No completar</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
      {status && <p className="form-status" role="status">{status}</p>}
    </form>
  </section>;
}

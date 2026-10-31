"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { projectContent, serviceLabel, servicesContent, startingContent } from "@/lib/content";

// Formulario de contacto del cierre del inicio (POST /api/contact).
export function ContactForm({ idPrefix = "", icon }: { idPrefix?: string; icon?: ReactNode }) {
  const [service, setService] = useState("");
  const [startingPoint, setStartingPoint] = useState("");
  const [contactMethod, setContactMethod] = useState<"email" | "telefono">("email");
  const [contactValue, setContactValue] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formCopy = projectContent.form;
  const id = (name: string) => `${idPrefix}${name}`;

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

  return <form className="project-form" onSubmit={submit}>
    <div className="form-col">
      <label htmlFor={id("contact-method")}>{formCopy.contactMethod}</label>
      <div className="contact-fields">
        <select id={id("contact-method")} value={contactMethod} onChange={(event) => { setContactMethod(event.target.value as "email" | "telefono"); setContactValue(""); }}>
          <option value="email">{formCopy.email}</option><option value="telefono">{formCopy.phone}</option>
        </select>
        <input aria-label={contactMethod === "email" ? formCopy.email : formCopy.phone} type={contactMethod === "email" ? "email" : "tel"} value={contactValue} onChange={(event) => setContactValue(event.target.value)} autoComplete={contactMethod === "email" ? "email" : "tel"} placeholder={contactMethod === "email" ? formCopy.emailPlaceholder : formCopy.phonePlaceholder} required />
      </div>
      <label htmlFor={id("service-select")}>{formCopy.service}</label>
      <select id={id("service-select")} value={service} onChange={(event) => setService(event.target.value)} required>
        <option value="" disabled>{formCopy.choose}</option>{servicesContent.list.map((value) => <option key={value} value={value}>{serviceLabel(value)}</option>)}
      </select>
      <label htmlFor={id("starting-select")}>{formCopy.startingPoint}</label>
      <select id={id("starting-select")} value={startingPoint} onChange={(event) => setStartingPoint(event.target.value)} required>
        <option value="" disabled>{formCopy.choose}</option>{startingContent.list.map((item) => <option key={item.title} value={item.title}>{item.opcion}</option>)}
      </select>
    </div>
    <div className="form-col">
      <label htmlFor={id("description")}>{formCopy.description}</label>
      <textarea id={id("description")} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={formCopy.descriptionPlaceholder} rows={4} minLength={10} maxLength={3000} required />
      <button className="home-button form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? formCopy.submitting : formCopy.submit} {icon}</button>
    </div>
    <div className="sr-only" aria-hidden="true"><label htmlFor={id("website")}>No completar</label><input id={id("website")} name="website" tabIndex={-1} autoComplete="off" /></div>
    {status && <p className="form-status" role="status">{status}</p>}
  </form>;
}

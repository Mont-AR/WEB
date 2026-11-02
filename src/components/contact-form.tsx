"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { content, projectContent, serviceLabel, servicesContent, startingContent } from "@/lib/content";

const FLIGHT_MS = 900;

// Formulario de contacto del cierre del inicio (POST /api/contact), con forma de postal: cuando el
// servidor confirma el envío vuela hasta el buzón del final del camino y se levanta la banderita
// (home-hero-scene.tsx). Si falla, se queda en su lugar con el error y lo que la persona escribió.
export function ContactForm({ idPrefix = "", icon }: { idPrefix?: string; icon?: ReactNode }) {
  const [service, setService] = useState("");
  const [startingPoint, setStartingPoint] = useState("");
  const [contactMethod, setContactMethod] = useState<"email" | "telefono">("email");
  const [contactValue, setContactValue] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const flight = useRef<Animation | null>(null);
  const formCopy = projectContent.form;
  const id = (name: string) => `${idPrefix}${name}`;

  useEffect(() => { if (sent) againRef.current?.focus({ preventScroll: true }); }, [sent]);

  // lleva la postal hasta la puerta del buzón; sin paisaje o con movimiento reducido, no hay vuelo
  const flyToMailbox = async () => {
    const form = formRef.current, stage = form?.closest(".home-stage");
    const point: { x?: number; y?: number } = {};
    window.dispatchEvent(new CustomEvent("home:mail-point", { detail: point }));
    if (!form || !stage || point.x === undefined || point.y === undefined || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const box = form.getBoundingClientRect(), origin = stage.getBoundingClientRect();
    const dx = origin.left + point.x - (box.left + box.width / 2), dy = origin.top + point.y - (box.top + box.height / 2);
    flight.current = form.animate(
      [{ transform: "none" }, { transform: `translate(${dx}px,${dy}px) scale(.05) rotate(-9deg)` }],
      { duration: FLIGHT_MS, easing: "cubic-bezier(.6,0,.3,1)", fill: "forwards" },
    );
    await flight.current.finished.catch(() => undefined);
  };

  const writeAnother = () => {
    flight.current?.cancel();
    flight.current = null;
    setSent(false);
    window.dispatchEvent(new CustomEvent("home:mail", { detail: false }));
  };

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
      await flyToMailbox();
      window.dispatchEvent(new CustomEvent("home:mail", { detail: true }));
      setSent(true);
      setDescription("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : formCopy.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <div className="postal" data-sent={sent ? "" : undefined}>
    <form ref={formRef} className="project-form" onSubmit={submit}>
      <div className="form-col form-col-message">
        <p className="postal-head" aria-hidden="true">{formCopy.postal}</p>
        <label htmlFor={id("description")}>{formCopy.description}</label>
        <textarea id={id("description")} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={formCopy.descriptionPlaceholder} rows={4} minLength={10} maxLength={3000} required />
      </div>
      <div className="form-col">
        <div className="postal-address">
          <p><b>{formCopy.para} {content.marca.firma}</b>{content.contacto.email}</p>
          <span className="postal-stamp" aria-hidden="true"/>
        </div>
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
        <button className="home-button form-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? formCopy.submitting : formCopy.submit} {icon}</button>
      </div>
      <div className="sr-only" aria-hidden="true"><label htmlFor={id("website")}>No completar</label><input id={id("website")} name="website" tabIndex={-1} autoComplete="off" /></div>
      {status && <p className="form-status" role="alert">{status}</p>}
    </form>
    <div className="postal-sent" role="status">
      {sent && <>
        <p>{formCopy.success}</p>
        <button ref={againRef} className="home-button home-button-small" type="button" onClick={writeAnother}>{formCopy.otra}</button>
      </>}
    </div>
  </div>;
}

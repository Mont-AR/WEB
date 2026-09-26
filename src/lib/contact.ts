import { projectContent, serviceLabel, servicesContent, startingContent } from "./content";

export type ContactSubmission = {
  contactMethod: "email" | "telefono";
  contactValue: string;
  service: string;
  startingPoint: string;
  description: string;
  website: string;
};

export function validateContactSubmission(input: unknown): ContactSubmission | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const contactMethod = data.contactMethod;
  const contactValue = typeof data.contactValue === "string" ? data.contactValue.trim() : "";
  const service = data.service;
  const startingPoint = data.startingPoint;
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const website = typeof data.website === "string" ? data.website.trim() : "";

  if (contactMethod !== "email" && contactMethod !== "telefono") return null;
  if (contactValue.length > 254 || description.length < 10 || description.length > 3000) return null;
  if (!servicesContent.list.includes(String(service))) return null;
  if (!startingContent.list.some((item) => item.title === startingPoint)) return null;
  if (contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) return null;
  if (contactMethod === "telefono" && !/^[+\d()\s.-]+$/.test(contactValue)) return null;
  if (contactMethod === "telefono" && (contactValue.replace(/\D/g, "").length < 8 || contactValue.replace(/\D/g, "").length > 16)) return null;

  return { contactMethod, contactValue, service: String(service), startingPoint: String(startingPoint), description, website };
}

export function formatProjectEmail(submission: ContactSubmission): string {
  const form = projectContent.form;
  return [
    "Nuevo proyecto desde Mont.AR",
    "",
    `${form.contactMethod}: ${submission.contactMethod === "email" ? form.email : form.phone}`,
    `Dato de contacto: ${submission.contactValue}`,
    `${form.service}: ${serviceLabel(submission.service)}`,
    `${form.startingPoint}: ${submission.startingPoint}`,
    "",
    `${form.description}:`,
    submission.description,
  ].join("\n");
}

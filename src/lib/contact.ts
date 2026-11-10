// Formulario de contacto: validación y texto del aviso (como WEB/src/lib/contact.ts). Lo usa la función
// de Cloudflare Pages (functions/api/contact.ts); el formulario puede usar la misma validación.
import { projectContent, serviceLabel, servicesContent, startingContent } from "../content.js";

export type ContactSubmission = {
	contactMethod: "email" | "telefono";
	contactValue: string;
	service: string;
	startingPoint: string;
	description: string;
	/** campo trampa: invisible para las personas; si llega con algo, lo completó un bot */
	website: string;
};

/** Frase clara de un punto de partida (para el aviso); si no la tiene, su título. */
const startingLabel = (title: string) => startingContent.list.find((item) => item.title === title)?.opcion ?? title;

/** Datos válidos del formulario, o null si algo no cumple. */
export function validateContactSubmission(input: unknown): ContactSubmission | null {
	if (!input || typeof input !== "object") return null;
	const data = input as Record<string, unknown>;
	const contactMethod = data.contactMethod;
	const contactValue = typeof data.contactValue === "string" ? data.contactValue.trim() : "";
	const service = String(data.service ?? "");
	const startingPoint = String(data.startingPoint ?? "");
	const description = typeof data.description === "string" ? data.description.trim() : "";
	const website = typeof data.website === "string" ? data.website.trim() : "";
	const digits = contactValue.replace(/\D/g, "").length;

	if (contactMethod !== "email" && contactMethod !== "telefono") return null;
	if (contactValue.length > 254 || description.length < 10 || description.length > 3000) return null;
	if (!servicesContent.list.includes(service)) return null;
	if (!startingContent.list.some((item) => item.title === startingPoint)) return null;
	if (contactMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactValue)) return null;
	if (contactMethod === "telefono" && (!/^[+\d()\s.-]+$/.test(contactValue) || digits < 8 || digits > 16)) return null;

	return { contactMethod, contactValue, service, startingPoint, description, website };
}

/** Texto del aviso de un proyecto nuevo (para mail, chat o lo que se use). */
export function formatProjectMessage(submission: ContactSubmission): string {
	const form = projectContent.form;
	return [
		"Nuevo proyecto desde Mont.AR",
		"",
		`${form.contactMethod}: ${submission.contactMethod === "email" ? form.email : form.phone}`,
		`Dato de contacto: ${submission.contactValue}`,
		`${form.service}: ${serviceLabel(submission.service)}`,
		`${form.startingPoint}: ${startingLabel(submission.startingPoint)}`,
		"",
		`${form.description}:`,
		submission.description,
	].join("\n");
}

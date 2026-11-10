// POST /api/contact: el formulario del cierre (lo llama worker/index.ts). Valida los datos
// (src/lib/contact.ts) y manda el aviso por mail con Resend (src/lib/resend.ts).
//
// Variables (Cloudflare → Workers & Pages → montar → Settings → Variables and Secrets):
//   RESEND_API_KEY      secreto: la clave de Resend
//   CONTACT_FROM_EMAIL  secreto: remitente de un dominio verificado en Resend, p. ej. "Mont.AR <contacto@montivero.ar>"
//   CONTACT_TO_EMAIL    a quién llega el aviso (en wrangler.jsonc; si falta, el mail de contacto de content.js)
// Probar en local: `npm run cf:dev`, con esas variables en .dev.vars (o .env).
import { content, projectContent } from "../src/content.js";
import { formatProjectMessage, validateContactSubmission, type ContactSubmission } from "../src/lib/contact";
import { sendResendEmail } from "../src/lib/resend";

/** Variables y secretos del Worker en Cloudflare. */
export type ContactEnv = {
	RESEND_API_KEY?: string;
	CONTACT_FROM_EMAIL?: string;
	CONTACT_TO_EMAIL?: string;
};

const MAX_BODY = 8192;
const json = (body: unknown, status = 200) => Response.json(body, { status });
const invalid = () => json({ error: "Revisá los datos del formulario e intentá de nuevo." }, 400);

/** Resultado del envío: "sent", "not-configured" (faltan variables) o "failed" (Resend no lo aceptó). */
type Delivery = "sent" | "not-configured" | "failed";

/** Manda el aviso de un proyecto nuevo por mail con Resend; se responde directo a quien escribió. */
async function deliver(env: ContactEnv, submission: ContactSubmission): Promise<Delivery> {
	const apiKey = env.RESEND_API_KEY;
	const from = env.CONTACT_FROM_EMAIL;
	if (!apiKey || !from) return "not-configured";
	const result = await sendResendEmail({
		apiKey,
		from,
		to: env.CONTACT_TO_EMAIL || content.contacto.email,
		subject: "Nuevo proyecto desde Mont.AR",
		text: formatProjectMessage(submission),
		replyTo: submission.contactMethod === "email" ? submission.contactValue : undefined,
	});
	if (!result.ok) console.error("Resend no aceptó el envío:", result.status);
	return result.ok ? "sent" : "failed";
}

/** Atiende el POST del formulario. */
export async function handleContact(request: Request, env: ContactEnv): Promise<Response> {
	if (!request.headers.get("content-type")?.includes("application/json")) {
		return json({ error: "El formulario requiere datos JSON." }, 415);
	}
	if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) {
		return json({ error: "La descripción es demasiado larga." }, 413);
	}

	let input: unknown;
	try {
		const body = await request.text();
		if (body.length > MAX_BODY) return json({ error: "La descripción es demasiado larga." }, 413);
		input = JSON.parse(body);
	} catch {
		return invalid();
	}

	const submission = validateContactSubmission(input);
	if (!submission) return invalid();
	// campo trampa completo: es un bot; se le responde bien y no se manda nada
	if (submission.website) return json({ ok: true });

	try {
		const result = await deliver(env, submission);
		if (result === "sent") return json({ ok: true });
		if (result === "not-configured") {
			return json({ error: "El formulario todavía no está configurado. Intentá de nuevo más tarde." }, 503);
		}
		return json({ error: projectContent.form.error }, 502);
	} catch (error) {
		console.error("No se pudo enviar el aviso:", error instanceof Error ? error.name : "Error desconocido");
		return json({ error: projectContent.form.error }, 502);
	}
}

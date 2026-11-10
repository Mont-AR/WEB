// Envío de mails con Resend (https://resend.com), por su API HTTP: funciona igual en Cloudflare (fetch).
// Lo usa el Worker del formulario (worker/contact.ts). Es el de la versión Next de WEB.

export type ResendMessage = {
	apiKey: string;
	/** remitente de un dominio verificado en Resend, p. ej. "Mont.AR <contacto@montivero.ar>" */
	from: string;
	to: string;
	subject: string;
	text: string;
	/** a quién se responde: el mail de quien escribió, si dejó uno */
	replyTo?: string;
};

/**
 * Manda el mail. `ok` es true solo si Resend lo aceptó y devolvió su id. Si lo rechaza, `error` trae el
 * motivo que da Resend (p. ej. "validation_error: The montivero.ar domain is not verified"), para los logs.
 */
export async function sendResendEmail(message: ResendMessage, transport: typeof fetch = fetch) {
	const response = await transport("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${message.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: message.from,
			to: [message.to],
			subject: message.subject,
			text: message.text,
			...(message.replyTo ? { reply_to: message.replyTo } : {}),
		}),
		signal: AbortSignal.timeout(10000),
	});
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { name?: unknown; message?: unknown } | null;
		const error = [body?.name, body?.message].filter((part) => typeof part === "string").join(": ");
		return { ok: false, status: response.status, error };
	}
	const result = (await response.json().catch(() => null)) as { id?: unknown } | null;
	return { ok: typeof result?.id === "string", status: response.status };
}

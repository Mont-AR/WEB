import { content, projectContent } from "@/lib/content";
import { formatProjectEmail, validateContactSubmission } from "@/lib/contact";
import { sendResendEmail } from "@/lib/resend";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json({ error: "El formulario requiere datos JSON." }, { status: 415 });
  }

  const announcedLength = Number(request.headers.get("content-length") ?? 0);
  if (announcedLength > 8192) {
    return Response.json({ error: "La descripción es demasiado larga." }, { status: 413 });
  }

  let input: unknown;
  try {
    const body = await request.text();
    if (body.length > 8192) return Response.json({ error: "La descripción es demasiado larga." }, { status: 413 });
    input = JSON.parse(body);
  } catch {
    return Response.json({ error: "Revisá los datos del formulario e intentá de nuevo." }, { status: 400 });
  }

  const submission = validateContactSubmission(input);
  if (!submission) {
    return Response.json({ error: "Revisá los datos del formulario e intentá de nuevo." }, { status: 400 });
  }
  if (submission.website) return Response.json({ ok: true });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL || content.contacto.email;
  if (!apiKey || !from) {
    return Response.json({ error: "El formulario todavía no está configurado. Intentá de nuevo más tarde." }, { status: 503 });
  }

  try {
    const result = await sendResendEmail({
      apiKey,
      from,
      to,
      subject: "Nuevo proyecto desde Mont.AR",
      text: formatProjectEmail(submission),
      replyTo: submission.contactMethod === "email" ? submission.contactValue : undefined,
    });
    if (!result.ok) {
      console.error("Resend no aceptó el envío:", result.status);
      return Response.json({ error: projectContent.form.error }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("No se pudo contactar a Resend:", error instanceof Error ? error.name : "Error desconocido");
    return Response.json({ error: projectContent.form.error }, { status: 502 });
  }
}

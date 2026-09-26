type ResendMessage = {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

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
  if (!response.ok) return { ok: false, status: response.status };
  const result = await response.json() as { id?: unknown };
  return { ok: typeof result.id === "string", status: response.status };
}

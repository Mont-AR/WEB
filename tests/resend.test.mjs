import assert from "node:assert/strict";
import test from "node:test";
import { sendResendEmail } from "../src/lib/resend.ts";

test("sends the contact message to Resend with the server API key", async () => {
  let received;
  const transport = async (url, options) => {
    received = { url, options };
    return new Response(JSON.stringify({ id: "email_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  const result = await sendResendEmail({
    apiKey: "test_key",
    from: "Mont.AR <contacto@montivero.ar>",
    to: "fabricio@montivero.ar",
    subject: "Nuevo proyecto desde Mont.AR",
    text: "Detalles del proyecto",
    replyTo: "cliente@example.com",
  }, transport);

  assert.deepEqual(result, { ok: true, status: 200 });
  assert.equal(received.url, "https://api.resend.com/emails");
  assert.equal(received.options.headers.Authorization, "Bearer test_key");
  assert.deepEqual(JSON.parse(received.options.body), {
    from: "Mont.AR <contacto@montivero.ar>",
    to: ["fabricio@montivero.ar"],
    subject: "Nuevo proyecto desde Mont.AR",
    text: "Detalles del proyecto",
    reply_to: "cliente@example.com",
  });
});

test("does not report success when Resend rejects the message", async () => {
  const result = await sendResendEmail({
    apiKey: "test_key",
    from: "Mont.AR <contacto@montivero.ar>",
    to: "fabricio@montivero.ar",
    subject: "Nuevo proyecto desde Mont.AR",
    text: "Detalles del proyecto",
  }, async () => new Response("Forbidden", { status: 403 }));

  assert.deepEqual(result, { ok: false, status: 403 });
});

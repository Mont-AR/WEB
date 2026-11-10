// Worker del sitio (Cloudflare Workers con assets estáticos, wrangler.jsonc).
// Los archivos del build (dist/) los sirve Cloudflare directo, sin pasar por acá; solo las rutas de
// "run_worker_first" (/api/*) llegan a este código: /api/contact atiende el formulario.
import { handleContact, type ContactEnv } from "./contact";

type Env = ContactEnv & {
	/** los archivos de dist/ (assets.binding en wrangler.jsonc) */
	ASSETS: { fetch(request: Request): Promise<Response> };
};

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const { pathname } = new URL(request.url);
		if (pathname === "/api/contact") {
			if (request.method === "POST") return handleContact(request, env);
			return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
		}
		if (pathname.startsWith("/api/")) return Response.json({ error: "No encontrado." }, { status: 404 });
		return env.ASSETS.fetch(request);
	},
};

// robots.txt: todo el sitio se puede rastrear; indica dónde está el sitemap.
import type { APIRoute } from "astro";
import { siteUrl } from "../lib/site";

export const GET: APIRoute = () =>
	new Response(`User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});

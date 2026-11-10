// sitemap.xml: el sitio es una sola página; lastmod es la fecha del build.
import type { APIRoute } from "astro";
import { siteUrl } from "../lib/site";

export const GET: APIRoute = () => {
	const lastmod = new Date().toISOString().slice(0, 10);
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
	return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};

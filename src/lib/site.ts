import { content } from "./content";

const rawSiteUrl = process.env.SITE_URL ?? `https://${content.dominio}`;

/** Origen canónico del sitio, siempre con protocolo y sin barra final. */
export const siteUrl = (rawSiteUrl.startsWith("http") ? rawSiteUrl : `https://${rawSiteUrl}`).replace(/\/+$/, "");

export const siteName = content.marca.nombre;
export const siteTitle = content.seo.titulo;
export const siteDescription = content.seo.descripcion;

export const ogImage = {
  url: "/og/montar-og.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  alt: "El explorador de MONT.AR recorre un paisaje nocturno camino a la cima",
} as const;

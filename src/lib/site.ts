// Datos del sitio para SEO (como WEB/src/lib/site.ts y structured-data.ts).
import { content, serviceLabel, servicesContent } from "../content.js";

/** Origen canónico, sin barra final (astro.config.mjs → site). */
export const siteUrl = (import.meta.env.SITE ?? `https://${content.dominio}`).replace(/\/+$/, "");
export const siteName = content.marca.nombre;
export const siteTitle = content.seo.titulo;
export const siteDescription = content.seo.descripcion;
export const author = content.marca.firma.split(" · ")[0];

export const ogImage = {
	url: "/og/montar-og.jpg",
	width: 1200,
	height: 630,
	type: "image/jpeg",
	alt: "MONT.AR: herramientas digitales para dar el próximo paso, sobre un atardecer dibujado a mano con un sendero que sube a la cima",
} as const;

/** Datos estructurados (schema.org): el sitio, el negocio y sus servicios. */
export const structuredData = {
	"@context": "https://schema.org",
	"@graph": [
		{
			"@type": "WebSite",
			"@id": `${siteUrl}/#website`,
			url: `${siteUrl}/`,
			name: siteName,
			description: siteDescription,
			inLanguage: "es-AR",
			publisher: { "@id": `${siteUrl}/#organization` },
		},
		{
			"@type": "ProfessionalService",
			"@id": `${siteUrl}/#organization`,
			name: siteName,
			url: `${siteUrl}/`,
			description: siteDescription,
			image: `${siteUrl}${ogImage.url}`,
			logo: `${siteUrl}/icon.png`,
			email: content.contacto.email,
			telephone: content.contacto.telefono,
			founder: { "@type": "Person", name: author },
			areaServed: { "@type": "Country", name: "Argentina" },
			knowsAbout: servicesContent.list.map(serviceLabel),
			contactPoint: {
				"@type": "ContactPoint",
				contactType: "customer service",
				email: content.contacto.email,
				telephone: content.contacto.telefono,
				availableLanguage: ["es-AR"],
			},
			hasOfferCatalog: {
				"@type": "OfferCatalog",
				name: "Servicios",
				itemListElement: servicesContent.list.map((service) => ({
					"@type": "Offer",
					itemOffered: { "@type": "Service", name: serviceLabel(service) },
				})),
			},
		},
	],
};

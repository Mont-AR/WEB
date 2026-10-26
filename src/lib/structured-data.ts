import { content, serviceLabel, servicesContent } from "./content";
import { ogImage, siteDescription, siteName, siteUrl } from "./site";

const founder = content.marca.firma.split(" · ")[0];

/**
 * Datos estructurados (schema.org) para que los buscadores entiendan el sitio,
 * el negocio y los servicios ofrecidos.
 */
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
      founder: { "@type": "Person", name: founder },
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

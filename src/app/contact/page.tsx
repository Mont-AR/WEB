import type { Metadata } from "next";
import { Journey } from "@/components/journey";
import { projectContent } from "@/lib/content";
import { ogImage, siteName, siteUrl } from "@/lib/site";

const title = "Contacto";
const description = `${projectContent.title}: ${projectContent.descripcion} Webs, sistemas y automatizaciones a medida.`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${siteUrl}/contact` },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: `${siteUrl}/contact`,
    siteName,
    title: `${title} | ${siteName}`,
    description,
    images: [ogImage],
  },
};

export default function Contact() {
  return <Journey />;
}

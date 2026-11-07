import type { Metadata, Viewport } from "next";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";
import { SiteCursor } from "@/components/site-cursor";
import { content } from "@/lib/content";
import { motionFlag } from "@/lib/motion";
import { siteDescription, siteName, siteTitle, siteUrl, ogImage } from "@/lib/site";
import { structuredData } from "@/lib/structured-data";

const author = content.marca.firma.split(" · ")[0];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: content.seo.palabrasClave,
  applicationName: siteName,
  authors: [{ name: author, url: siteUrl }],
  creator: author,
  publisher: siteName,
  category: "technology",
  alternates: { canonical: `${siteUrl}/` },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: `${siteUrl}/`,
    siteName,
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage.url],
  },
  formatDetection: { email: false, address: false, telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#070b39",
  colorScheme: "dark",
};

const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");

// html.js: hay JavaScript. Se marca apenas llega el HTML (antes que React) para que la versión animada
// no parpadee; sin JS no se marca y el inicio se muestra estático y apilado (home.css, "sin JS").
const jsFlag = 'document.documentElement.classList.add("js")';

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `${jsFlag};${motionFlag}` }}/>
      </head>
      <body>
        {children}
        <SiteCursor/>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </body>
    </html>
  );
}

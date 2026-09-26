import type { Metadata } from "next";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mont.AR — Tus herramientas digitales",
  description: "Webs, sistemas y automatizaciones a medida. Una nueva forma de avanzar con Fabricio Montivero.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}

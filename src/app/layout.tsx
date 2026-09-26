import type { Metadata } from "next";
import "@fontsource/press-start-2p/400.css";
import "./globals.css";
import { heroContent } from "@/lib/content";

export const metadata: Metadata = {
  title: heroContent.title,
  description: heroContent.description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-AR"><body>{children}</body></html>;
}

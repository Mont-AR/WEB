import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // la página de contacto anterior (/contact) pasó a ser el formulario del cierre del inicio
  async redirects() {
    return [{ source: "/contact", destination: "/#contact", permanent: true }];
  },
};
export default nextConfig;

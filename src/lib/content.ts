import rawContent from "../../content.json";

type HeroSection = {
  id: "hero";
  titlePrefix: string;
  title: string;
  description: string;
  action: string;
};

type ServicesSection = {
  id: "what-i-do";
  navLabel: string;
  title: string;
  descripcion: string;
  list: string[];
  labels: Record<string, string>;
  examples: string;
};

type StartingSection = {
  id: "starting-point";
  navLabel: string;
  title: string;
  descripcion: string;
  list: { title: string; description: string }[];
};

type ProjectSection = {
  id: "project";
  navLabel: string;
  title: string;
  descripcion: string;
  form: {
    contactMethod: string;
    email: string;
    phone: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    service: string;
    startingPoint: string;
    description: string;
    descriptionPlaceholder: string;
    choose: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
};

type SiteContent = {
  dominio: string;
  contacto: { email: string; telefono: string; whatsapp: string };
  marca: { nombre: string; firma: string };
  interfaz: {
    scroll: string;
    recorridoCompleto: string;
    inicio: string;
    etapas: string;
    whatsapp: string;
  };
  seccions: [HeroSection, ServicesSection, StartingSection, ProjectSection];
};

export const content = rawContent as SiteContent;
export const [heroContent, servicesContent, startingContent, projectContent] = content.seccions;
export const serviceLabel = (value: string) => servicesContent.labels[value] ?? value;

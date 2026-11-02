import rawContent from "../../content.json";

type HeroSection = {
  id: "hero";
  title: string;
  subtitle: string;
};

type ServicesSection = {
  id: "what-i-do";
  title: string;
  list: string[];
  labels: Record<string, string>;
};

type StartingSection = {
  id: "starting-point";
  /** title: valor que se envía y se valida; opcion: frase clara para el formulario y el mail */
  list: { title: string; opcion: string }[];
};

type ProjectSection = {
  id: "project";
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
    postal: string;
    para: string;
    otra: string;
  };
};

type HomeContent = {
  nav: { contacto: string };
  hero: { kicker: string; scroll: string };
  relato: { notaArriba: string; texto: string; notaAbajo: string };
  servicios: { kicker: string; descripciones: Record<string, string> };
  proyectos: {
    kicker: string;
    titulo: string;
    descripcion: string;
    verProyecto: string;
    /**
     * `servicios` usa los valores de la lista de servicios. `imagen`, `video` y `link` son opcionales
     * (""); sin imagen ni video el proyecto se muestra solo con su texto.
     */
    lista: { nombre: string; descripcion: string; servicios: string[]; imagen: string; video: string; link: string }[];
  };
  proceso: { kicker: string; titulo: string; descripcion: string; pasos: { titulo: string; descripcion: string }[] };
  sobreMi: { kicker: string; titulo: string; parrafos: string[] };
  cierre: { titulo: string; descripcion: string };
};

type SiteContent = {
  dominio: string;
  contacto: { email: string; telefono: string; whatsapp: string };
  marca: { nombre: string; firma: string };
  seo: {
    titulo: string;
    descripcion: string;
    palabrasClave: string[];
  };
  interfaz: { whatsapp: string };
  seccions: [HeroSection, ServicesSection, StartingSection, ProjectSection];
  inicio: HomeContent;
};

// `inicio` se asigna con chequeo completo; el resto conserva el cast por la tupla de secciones.
const { inicio, ...rest } = rawContent;
const home: HomeContent = inicio;
export const content: SiteContent = { ...(rest as Omit<SiteContent, "inicio">), inicio: home };
export const [heroContent, servicesContent, startingContent, projectContent] = content.seccions;
export const serviceLabel = (value: string) => servicesContent.labels[value] ?? value;
export const homeContent = content.inicio;
export const whatsappUrl = `https://wa.me/${content.contacto.whatsapp}?text=Hola%20Fabricio%2C%20quiero%20hablarte%20de%20un%20proyecto`;

/** Ícono pixel art de cada servicio (los valores de content.json). */
export const choiceIcons: Record<string, string> = {
  "web personalizada": "/card-icons/web.png",
  wordpress: "/card-icons/wordpress.png",
  "automatización": "/card-icons/automatizacion.png",
  "sistemas de gestión": "/card-icons/sistemas-de-gestion.png",
  bots: "/card-icons/bots.png",
  "google workspace": "/card-icons/google-workspace.png",
};

/** Frase clara de un punto de partida (para el formulario y el mail); si no la tiene, su título. */
export const startingLabel = (title: string) => startingContent.list.find((item) => item.title === title)?.opcion ?? title;

import rawContent from "../../content.json";

type HeroSection = {
  id: "hero";
  stageLabel: string;
  titlePrefix: string;
  title: string;
  subtitle: string;
  description: string;
  action: string;
};

type ServicesSection = {
  id: "what-i-do";
  navLabel: string;
  stageLabel: string;
  title: string;
  descripcion: string;
  list: string[];
  labels: Record<string, string>;
  examples: string;
};

type StartingSection = {
  id: "starting-point";
  navLabel: string;
  stageLabel: string;
  title: string;
  descripcion: string;
  /** title: tarjeta del recorrido (y valor que se envía); opcion: frase clara para el formulario */
  list: { title: string; opcion: string; description: string }[];
};

type ProjectSection = {
  id: "project";
  navLabel: string;
  stageLabel: string;
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
  interfaz: {
    scroll: string;
    playhead: string;
    recorridoCompleto: string;
    inicio: string;
    etapas: string;
    whatsapp: string;
  };
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

/** Ícono pixel art de cada servicio y punto de partida (los valores de content.json). */
export const choiceIcons: Record<string, string> = {
  "web personalizada": "/card-icons/web.png",
  wordpress: "/card-icons/wordpress.png",
  "automatización": "/card-icons/automatizacion.png",
  "sistemas de gestión": "/card-icons/sistemas-de-gestion.png",
  bots: "/card-icons/bots.png",
  "google workspace": "/card-icons/google-workspace.png",
  Crear: "/card-icons/crear.png",
  "Conectar y automatizar": "/card-icons/conectar-y-automatizar.png",
  "Destrabar y mejorar": "/card-icons/destrabar-y-mejorar.png",
};

/** Frase clara de un punto de partida (para el formulario y el mail); si no la tiene, su título. */
export const startingLabel = (title: string) => startingContent.list.find((item) => item.title === title)?.opcion ?? title;

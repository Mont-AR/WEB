// Contenido del sitio, copiado de WEB/content.json.
const data = {
  dominio: "montivero.ar",
  contacto: {
    email: "desarrollo@montivero.ar",
    telefono: "+54 9 11 7814 8489",
    whatsapp: "5491178148489"
  },
  marca: {
    nombre: "MONT.AR",
    firma: "Fabricio Montivero · AR"
  },
  seo: {
    titulo: "MONT.AR — Webs, sistemas y automatizaciones a medida",
    descripcion: "Desarrollo webs, sistemas de gestión, automatizaciones y bots a medida. WordPress, Google Workspace e integraciones. Fabricio Montivero · Argentina.",
    palabrasClave: [
      "desarrollo web",
      "diseño web",
      "sistemas de gestión",
      "automatización",
      "bots",
      "WordPress",
      "Google Workspace",
      "Fabricio Montivero",
      "Mont.AR",
      "Argentina"
    ]
  },
  interfaz: {
    whatsapp: "WhatsApp"
  },
  seccions: [
    {
      id: "hero",
      title: "herramientas digitales",
      subtitle: "PARA DAR EL PRÓXIMO PASO"
    },
    {
      id: "what-i-do",
      title: "¿Qué hago?",
      list: [
        "web personalizada",
        "wordpress",
        "automatización",
        "sistemas de gestión",
        "bots",
        "google workspace"
      ],
      labels: {
        web: "Web",
        wordpress: "WordPress",
        automatización: "Automatización",
        "sistemas de gestión": "Sistemas de gestión",
        bots: "Bots",
        "google workspace": "Google Workspace"
      }
    },
    {
      id: "starting-point",
      list: [
        {
          title: "Crear",
          opcion: "Empezar un proyecto desde cero"
        },
        {
          title: "Conectar y automatizar",
          opcion: "Automatizar o conectar sistemas"
        },
        {
          title: "Destrabar y mejorar",
          opcion: "Arreglar o mejorar algo que ya tengo"
        }
      ]
    },
    {
      id: "project",
      form: {
        contactMethod: "Forma de contacto",
        email: "Mail",
        phone: "Teléfono",
        emailPlaceholder: "tu@email.com",
        phonePlaceholder: "+54 9 ...",
        phoneInvalid: "Ingresá un teléfono válido: entre 8 y 16 números.",
        service: "Qué necesito",
        startingPoint: "En qué punto estoy",
        description: "Descripción",
        descriptionPlaceholder: "Contame brevemente qué querés hacer o mejorar...",
        choose: "Elegí una opción",
        submit: "Enviar",
        submitting: "Enviando...",
        success: "¡Gracias! Tu proyecto se envió. Te voy a contactar pronto.",
        error: "No pudimos enviar tu proyecto. Intentá de nuevo en unos minutos.",
        postal: "Tarjeta postal",
        para: "Para:",
        otra: "Escribir otra postal"
      }
    }
  ],
  inicio: {
    nav: {
      contacto: "Hablemos"
    },
    hero: {
      kicker: "Desarrollo a medida",
      scroll: "Scroll para explorar"
    },
    servicios: {
      kicker: "01 — Servicios",
      descripciones: {
        "web personalizada": "Sitios a medida, rápidos y fáciles de encontrar, pensados para lo que tu proyecto necesita mostrar.",
        wordpress: "Webs que podés actualizar vos mismo, con un diseño propio y sin plantillas recargadas.",
        automatización: "Tareas repetidas que pasan a hacerse solas: formularios, avisos, reportes y planillas.",
        "sistemas de gestión": "Herramientas internas para ordenar clientes, pedidos, turnos o stock en un solo lugar.",
        bots: "Asistentes para WhatsApp, Telegram o la web que responden y derivan consultas.",
        "google workspace": "Hojas de cálculo, formularios y Apps Script conectados para que el equipo trabaje mejor."
      }
    },
    proyectos: {
      kicker: "00 — Proyectos",
      titulo: "Proyectos",
      descripcion: "Algunos de los caminos recorridos.",
      verProyecto: "Ver proyecto",
      lista: [
        {
          nombre: "EITA — Tourette Argentina",
          descripcion: "Sitio institucional del Equipo Interdisciplinario Tourette Argentina, hecho en Astro: presenta al equipo, sus terapias y servicios, información sobre el síndrome y contacto directo por WhatsApp y mail.",
          servicios: [
            "web personalizada"
          ],
          imagen: "/proyectos/eita.webp",
          video: "",
          link: "https://eita.tourette.com.ar/"
        },
        {
          nombre: "Rizzo Propiedades — CRM inmobiliario",
          descripcion: "Panel para gestionar propiedades, clientes y consultas, con un bot de WhatsApp que responde y deriva a cada interesado. El video muestra la demo con datos de prueba.",
          servicios: [
            "sistemas de gestión",
            "bots"
          ],
          imagen: "",
          video: "",
          link: ""
        },
        {
          nombre: "Carga de ventas a BigQuery",
          descripcion: "Asistente paso a paso para validar y cargar archivos de ventas (.xls/.xlsx) en BigQuery, con mantenimiento de las tablas de clientes, países y productos y actualización del forecast. Es una herramienta interna de un cliente, por eso se muestra solo la descripción.",
          servicios: [
            "sistemas de gestión",
            "automatización"
          ],
          imagen: "",
          video: "",
          link: ""
        }
      ]
    },
    proceso: {
      kicker: "02 — Proceso",
      titulo: "¿Cómo lo hago?",
      descripcion: "Un camino corto y claro, de la idea a la herramienta funcionando.",
      pasos: [
        {
          titulo: "Charlamos",
          descripcion: "Me contás qué necesitás y en qué punto estás. Sin tecnicismos."
        },
        {
          titulo: "Propuesta",
          descripcion: "Te paso un plan con alcance, tiempos y presupuesto."
        },
        {
          titulo: "Desarrollo",
          descripcion: "Construyo la solución y te muestro avances para ajustar sobre la marcha."
        },
        {
          titulo: "Entrega",
          descripcion: "La dejamos funcionando y te acompaño en los primeros pasos."
        }
      ]
    },
    sobreMi: {
      kicker: "03 — Sobre mí",
      titulo: "Sobre mí",
      parrafos: [
        "Soy Fabricio Montivero, desarrollador de software en Argentina.",
        "Trabajo con personas, emprendimientos y equipos que necesitan una herramienta digital concreta: una web, un sistema para ordenar su gestión o una automatización que les devuelva tiempo.",
        "Me ocupo del proyecto de punta a punta: entender la necesidad, proponer la solución más simple que funcione, desarrollarla y acompañar después de la entrega."
      ]
    },
    cierre: {
      kicker: "04 — Contacto",
      titulo: "¿Listo para el próximo paso?",
      descripcion: "Contame en qué estás y armamos el camino juntos."
    }
  }
};

/**
 * Cada sección tiene su forma; sin esto, en JS `seccions` se infiere como un array de tipos mezclados.
 * @typedef {{ id: string, title: string, subtitle: string }} HeroSection
 * @typedef {{ id: string, title: string, list: string[], labels: Record<string, string> }} ServicesSection
 * @typedef {{ id: string, list: { title: string, opcion: string }[] }} StartingSection
 * @typedef {{ id: string, form: Record<string, string> }} ProjectSection
 * @typedef {Omit<typeof data, "seccions"> & { seccions: [HeroSection, ServicesSection, StartingSection, ProjectSection] }} SiteContent
 */

/** @type {SiteContent} */
export const content = /** @type {SiteContent} */ (/** @type {unknown} */ (data));

export const [heroContent, servicesContent, startingContent, projectContent] = content.seccions;
export const homeContent = content.inicio;

/** Nombre visible de un servicio; si no tiene etiqueta, el valor tal cual. */
export const serviceLabel = (value) => servicesContent.labels[value] ?? value;

export const whatsappUrl = `https://wa.me/${content.contacto.whatsapp}?text=Hola%20Fabricio%2C%20quiero%20hablarte%20de%20un%20proyecto`;

/** Ícono pixel art de cada servicio (los valores de la lista), como en WEB. */
/** @type {Record<string, string>} */
export const choiceIcons = {
  "web personalizada": "/card-icons/web.png",
  wordpress: "/card-icons/wordpress.png",
  "automatización": "/card-icons/automatizacion.png",
  "sistemas de gestión": "/card-icons/sistemas-de-gestion.png",
  bots: "/card-icons/bots.png",
  "google workspace": "/card-icons/google-workspace.png",
};

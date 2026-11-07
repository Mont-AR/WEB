import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { ContactForm } from "./contact-form";
import { HomeHeroScene } from "./home-hero-scene";
import { HomeProjectVideo } from "./home-project-video";
import { HomeScroll } from "./home-scroll";
import { HomeSelect } from "./home-select";
import { choiceIcons, content, heroContent, homeContent, serviceLabel, servicesContent, whatsappUrl } from "@/lib/content";

// Página de inicio: pantallas una al lado de la otra, como niveles de un jueguito (tipografía y
// botones 8-bit compartidos con Nube Voladora), sobre un paisaje dibujado a mano que se desplaza
// con parallax. El scroll vertical mueve la pista hacia la derecha; las pantallas con data-hold se
// detienen un tramo y en él reciben su progreso en --p (home-scroll.tsx): en mobile las tarjetas de
// servicios cruzan sobre el título. Las pantallas con data-reveal se animan solas al llegar (data-on):
// la frase de "sobre mí" se entinta y, en desktop, el título grande se achica y entra el contenido. Proyectos y pasos reciben --p
// según su posición en pantalla y entran al aparecer.
const { nav, hero, servicios, proyectos, proceso, sobreMi, cierre } = homeContent;
const [brandName, brandTld] = content.marca.nombre.split(".");
const vars = (values: Record<string, string | number>) => values as CSSProperties;

// Proyectos: ocultos por ahora (el contenido sigue en content.json → inicio.proyectos).
const SHOW_PROJECTS = false;

// Rotación y desplazamiento horizontal de cada tarjeta de servicio al cruzar la pantalla (mobile).
const CARD_TILT = [-3.5, 9.5, -9.6, 5.5, -6.5, 3];
const CARD_SHIFT = [-17, 15, -4, 19, -20, 6];

function Arrow() {
  return <svg className="arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M2 10h15m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"/></svg>;
}

function Chat() {
  return <svg className="arrow" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 4h14v9H9l-4 3v-3H3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter"/></svg>;
}

/** Frase que se entinta letra por letra sola, al llegar a su pantalla (home-scroll.tsx le pone
 * data-on). El texto está una sola vez, entero, en .sr-only (lectores de pantalla y bots); las letras
 * animadas se pintan con CSS desde data-c, así no se duplica en el HTML. */
function RevealText({ text, className = "" }: { text: string; className?: string }) {
  let index = 0;
  const words = text.split(" ");
  const total = text.replace(/ /g, "").length;
  return <p className={`home-reveal-text ${className}`} style={vars({ "--n": total })}>
    <span className="sr-only">{text}</span>
    <span aria-hidden="true">
      {words.map((word, w) => <span key={w}><span className="home-word">
        {[...word].map((char) => <span key={index} className="home-char" data-c={char} style={vars({ "--i": index++ })}/>)}
      </span>{w < words.length - 1 && " "}</span>)}
    </span>
  </p>;
}

// Tipeo del hero (ms): demora inicial, pausa entre bloques y velocidad por letra de cada bloque.
const TYPE_START = 450;
const TYPE_PAUSE = 260;
const TYPE_SPEED = { note: 32, title: 70, sub: 45 };

/** Tipeo como el diálogo de un jueguito: cada letra aparece de golpe en su momento (--d) con un
 * cursor de bloque detrás que se queda titilando al final. Comparte el reloj entre bloques para que
 * se escriban uno tras otro; es CSS puro, así que arranca con el primer pintado, sin esperar a JS.
 * Como en RevealText, el texto legible va una sola vez en .sr-only y las letras se pintan desde data-c. */
function createTypewriter() {
  let at = TYPE_START;
  return (text: string, speed: number, end = false) => {
    const chars = [...text];
    return <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{chars.map((char, i) => {
        if (char === " ") return " ";
        const d = at;
        at += speed;
        const isLast = i === chars.length - 1;
        if (isLast) at += TYPE_PAUSE;
        // el cursor de la última letra de un bloque espera la pausa; el del final queda titilando
        return <span key={i} className={`home-type${isLast && end ? " home-type-end" : ""}`} data-c={char} style={vars({ "--d": d, "--s": isLast ? speed + TYPE_PAUSE : speed })}/>;
      })}</span>
    </>;
  };
}

export function Home() {
  const type = createTypewriter();
  const titleWords = heroContent.title.split(" ");
  const servicesWords = servicesContent.title.split(" ");
  const services = servicesContent.list;

  return <div className="home">
    <HomeScroll/>
    <HomeSelect/>
    {/* hasta que el paisaje dibuja su primer cuadro (home-hero-scene.tsx marca .home[data-ready]) */}
    <div className="scene-loader home-loader" role="status" aria-label="Cargando el paisaje">
      <div className="loader-art" aria-hidden="true"><span className="loader-sun"/><span className="loader-mountain loader-mountain-back"/><span className="loader-mountain loader-mountain-front"/><span className="loader-path"/><span className="loader-traveler"/></div>
      <span className="loader-label">Cargando el camino<span className="loader-dots">...</span></span>
    </div>
    <noscript><style>{".home-loader{display:none}"}</style></noscript>
    <header className="home-header">
      <Link href="/" className="brand" aria-label={`${content.marca.nombre}, inicio`}>{brandName}<span>{brandTld}</span></Link>
      {/* va al formulario del cierre (home-scroll.tsx lleva el scroll hasta esa pantalla) */}
      <a href="#contact" className="home-button home-button-small">{nav.contacto} <Arrow/></a>
    </header>
    {/* abajo a la derecha, fijo en todas las pantallas */}
    <a className="home-button home-button-small home-dock" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Chat/> {content.interfaz.whatsapp}</a>

    {/* El scroll vertical mueve la pista hacia la derecha (home-scroll.tsx); el paisaje queda detrás. */}
    <div className="home-rail">
      <div className="home-stage">
        <div className="home-backdrop" aria-hidden="true">
          <HomeHeroScene/>
          <div className="home-scrim"/>
        </div>

        <main className="home-track">
          <section className="home-screen home-hero" data-screen aria-labelledby="home-title">
            <div className="home-hero-shade" aria-hidden="true"/>
            <div className="home-hero-copy">
              <p className="home-note">{type(hero.kicker, TYPE_SPEED.note)}</p>
              <h1 id="home-title" className="home-display">
                {titleWords.map((word, w) => <Fragment key={word}>{w > 0 && " "}<span className="home-line">{type(word, TYPE_SPEED.title)}</span></Fragment>)}
              </h1>
              <p className="home-hero-sub">{type(heroContent.subtitle, TYPE_SPEED.sub, true)}</p>
            </div>
            <p className="home-scroll-cue" aria-hidden="true"><span>{hero.scroll}</span><i/></p>
          </section>


          {/* en desktop, selección de personaje: el título se achica y aparecen las 6 tarjetas; la última
              señalada (mouse o foco; al principio, la primera) queda elegida con el cursor P1 y su
              descripción abajo. En mobile cruzan la pantalla. */}
          <section id="servicios" className="home-screen home-services" data-screen data-hold={(services.length + 1) * .55} data-hold-wide="0" data-reveal aria-labelledby="servicios-title" style={vars({ "--n": services.length })}>
            <div className="home-pin">
              <h2 id="servicios-title" className="home-display home-services-title">
                {servicesWords.map((word, w) => <Fragment key={word}>{w > 0 && " "}<span className="home-line">{word}</span></Fragment>)}
              </h2>
              <p className="home-note home-services-note">{servicios.kicker}</p>
              <ul className="home-slides">
                {services.map((value, k) => <li key={value} className="home-slide" tabIndex={0} data-selected={k === 0 ? "" : undefined} style={vars({ "--k": k, "--r": `${CARD_TILT[k % CARD_TILT.length]}deg`, "--x": `${CARD_SHIFT[k % CARD_SHIFT.length]}vw` })}>
                  <div className="home-slide-card">
                    <p className="home-slide-head"><span className="home-slide-code">{`MONT_${String(k + 1).padStart(2, "0")}`}</span><span>A</span></p>
                    <div className="home-slide-window"><img src={choiceIcons[value]} alt="" width={64} height={64} decoding="async" draggable={false}/></div>
                    <h3>{serviceLabel(value)}</h3>
                    <p className="home-slide-text">{servicios.descripciones[value]}</p>
                    <p className="home-slide-foot"><span>{`${String(k + 1).padStart(2, "0")}/${String(services.length).padStart(2, "0")}`}</span><span>{content.dominio.toUpperCase()}</span></p>
                  </div>
                  <div className="home-slide-info" aria-hidden="true"><p className="home-note">{`▶ ${serviceLabel(value)}`}</p><p>{servicios.descripciones[value]}</p></div>
                </li>)}
              </ul>
            </div>
          </section>

          {SHOW_PROJECTS && proyectos.lista.length > 0 && <section id="proyectos" className="home-screen home-projects" data-screen aria-labelledby="proyectos-title">
            <header className="home-panel home-section-head">
              <p className="home-note">{proyectos.kicker}</p>
              <h2 id="proyectos-title" className="home-display home-display-md">{proyectos.titulo}</h2>
              <p className="home-lead">{proyectos.descripcion}</p>
            </header>
            {proyectos.lista.map((project, index) => <article key={index} className={`home-panel home-project ${project.imagen || project.video ? "" : "home-project-text"}`} data-scene>
              {(project.imagen || project.video) && <div className="home-project-media">
                {project.video
                  ? <HomeProjectVideo src={project.video} poster={project.imagen}/>
                  : <img src={project.imagen} alt="" loading="lazy" decoding="async"/>}
              </div>}
              <div className="home-project-copy">
                <p className="home-note">{`${String(index + 1).padStart(2, "0")} — ${project.servicios.map(serviceLabel).join(" · ")}`}</p>
                <h3 className="home-display home-display-md">{project.nombre}</h3>
                <p className="home-caps">{project.descripcion}</p>
                {project.link && <a className="home-button" href={project.link} target="_blank" rel="noopener noreferrer">{proyectos.verProyecto} <Arrow/></a>}
              </div>
            </article>)}
          </section>}

          {/* al llegar, la frase se entinta sola; en desktop después se achica y entra el resto del texto */}
          <section id="sobre-mi" className="home-screen home-about" data-screen data-reveal aria-labelledby="sobre-mi-title">
            <div className="home-panel home-about-intro">
              <p className="home-note home-about-top"><span id="sobre-mi-title">{sobreMi.titulo}</span><span>{content.marca.firma}</span></p>
              <RevealText text={sobreMi.parrafos[0]}/>
            </div>
            <div className="home-panel home-about-body" data-scene>
              {sobreMi.parrafos.slice(1).map((text) => <p key={text}>{text}</p>)}
              <p className="home-about-links">
                <a href={`mailto:${content.contacto.email}`}>{content.contacto.email}</a>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">{content.interfaz.whatsapp}</a>
              </p>
            </div>
          </section>

          {/* en desktop, título grande que se achica y después los pasos juntos; en mobile, en fila */}
          <section id="proceso" className="home-screen home-process" data-screen data-reveal aria-labelledby="proceso-title">
            <header className="home-panel home-section-head">
              <p className="home-note">{proceso.kicker}</p>
              <h2 id="proceso-title" className="home-display home-display-md">{proceso.titulo}</h2>
              <p className="home-lead">{proceso.descripcion}</p>
            </header>
            <ol className="home-steps">
              {proceso.pasos.map((step, index) => <li key={step.titulo} className="home-step" data-scene>
                <span className="home-step-number">{String(index + 1).padStart(2, "0")}</span>
                <h3 className="home-display">{step.titulo}</h3>
                <p>{step.descripcion}</p>
              </li>)}
            </ol>
          </section>

          <section id="contact" className="home-screen home-closing" data-screen aria-labelledby="cierre-title">
            <div className="home-closing-copy">
              <h2 id="cierre-title" className="home-display home-display-md">{cierre.titulo}</h2>
              <p className="home-lead">{cierre.descripcion}</p>
              <ContactForm idPrefix="home-" icon={<Arrow/>}/>
              {/* sin JS el formulario no puede enviar: en su lugar, los contactos directos (home.css) */}
              <p className="home-closing-direct">
                <a className="home-button" href={whatsappUrl} target="_blank" rel="noopener noreferrer"><Chat/> {content.interfaz.whatsapp}</a>
                <a href={`mailto:${content.contacto.email}`}>{content.contacto.email}</a>
              </p>
            </div>
          </section>

        </main>
      </div>
    </div>
  </div>;
}

// Animaciones del sitio: encendidas o apagadas (html.calm = apagadas, la misma lectura estática que con
// "reducir movimiento"). Por defecto siguen la preferencia del sistema; el toggle (motion-toggle.tsx)
// guarda la elección en el navegador. El script de layout.tsx (motionFlag) aplica la clase antes del
// primer pintado y cambia el estado con cada clic del toggle; los componentes lo leen en vivo con
// isCalm() y al cambiar se avisa con el evento MOTION_EVENT.
export const MOTION_KEY = "montar:motion";
export const MOTION_EVENT = "motion:change";

/** Script del <head>: pone html.calm si la elección guardada es "off" o, sin elección, si el sistema pide
 * menos movimiento. También atiende los clics del toggle (.motion-toggle), así funciona desde la pantalla
 * de carga, antes de que React tome la página. */
export const motionFlag = `(function(d){var K=${JSON.stringify(MOTION_KEY)},m;try{m=localStorage.getItem(K)}catch(e){}if(m==="off"||(m!=="on"&&matchMedia("(prefers-reduced-motion: reduce)").matches))d.classList.add("calm");document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest(".motion-toggle");if(!b)return;var c=d.classList.toggle("calm");try{localStorage.setItem(K,c?"off":"on")}catch(e){}b.setAttribute("aria-checked",String(!c));dispatchEvent(new CustomEvent(${JSON.stringify(MOTION_EVENT)},{detail:c}))})})(document.documentElement)`;

export const isCalm = () => document.documentElement.classList.contains("calm");

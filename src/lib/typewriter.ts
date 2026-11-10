// Reloj del tipeo (como createTypewriter de WEB/home.tsx): cada letra aparece en su momento (--d, ms) con
// un cursor de bloque detrás durante --s. Los bloques de una sección comparten el reloj, así se escriben
// uno tras otro; `end` es cuándo termina todo, para que el resto del contenido entre después.

/** Velocidades por letra (ms), las de WEB; `display` para los títulos de sección. */
export const TYPE_SPEED = { note: 32, title: 70, display: 45, sub: 45 };
const TYPE_PAUSE = 260;

export type Letter = { char: string; d?: number; s?: number; end?: boolean };
export type Typed = { text: string; letters: Letter[] };

export function createClock(start = 0) {
	let at = start;
	return {
		/** Letras de un bloque con su demora; los espacios quedan como texto. `end`: el cursor queda titilando. */
		type(text: string, speed: number, end = false): Typed {
			const chars = [...text];
			const letters = chars.map((char, i) => {
				if (char === " ") return { char };
				const d = at;
				at += speed;
				const isLast = i === chars.length - 1;
				if (isLast) at += TYPE_PAUSE;
				return { char, d, s: isLast ? speed + TYPE_PAUSE : speed, end: isLast && end };
			});
			return { text, letters };
		},
		/** Suma una espera al reloj (ms). */
		wait(ms: number) { at += ms; },
		get end() { return at; },
	};
}

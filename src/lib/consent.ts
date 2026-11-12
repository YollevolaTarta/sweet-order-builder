// Elección de cookies del usuario (T-012, DEC-009 y DEC-010).
// Aprobado por Dirección: no sustituir por el procedimiento de cookies de Lovable sin su aprobación.
//
// - Se guarda en localStorage, clave "yllt_cookies": { version: 1, publicidad: boolean, fecha: ISO }.
// - Caduca a los 365 días o si cambia la versión: se borra y vuelve a salir el banner.
// - Si el navegador bloquea el almacenamiento, la elección solo vale mientras la página está abierta
//   y el píxel no se carga nunca (ver `persistida`).

const CLAVE = "yllt_cookies";
const VERSION = 1;
const DURACION_MS = 365 * 24 * 60 * 60 * 1000;
const EVENTO_ABRIR = "yllt:configurar-cookies";

export type Consentimiento = {
  version: number;
  publicidad: boolean;
  fecha: string;
  /** true si la elección quedó guardada en el navegador. Sin guardar, nunca se carga el píxel. */
  persistida: boolean;
};

const oyentes = new Set<() => void>();
let cache: Consentimiento | null | undefined; // undefined = todavía no leído

function leer(): Consentimiento | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<Consentimiento>;
    const t = typeof c.fecha === "string" ? Date.parse(c.fecha) : NaN;
    const valida =
      c.version === VERSION &&
      typeof c.publicidad === "boolean" &&
      !Number.isNaN(t) &&
      Date.now() - t <= DURACION_MS;
    if (!valida) {
      window.localStorage.removeItem(CLAVE);
      return null;
    }
    return {
      version: VERSION,
      publicidad: c.publicidad as boolean,
      fecha: c.fecha as string,
      persistida: true,
    };
  } catch {
    return null;
  }
}

/** Elección actual, o null si no hay (o ha caducado). Siempre null en el servidor. */
export function getConsent(): Consentimiento | null {
  if (typeof window === "undefined") return null;
  if (cache === undefined) cache = leer();
  return cache;
}

/** Guarda la elección y avisa a los componentes. */
export function setConsent(publicidad: boolean): Consentimiento {
  const fecha = new Date().toISOString();
  let persistida = false;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, publicidad, fecha }));
    persistida = true;
  } catch {
    persistida = false;
  }
  cache = { version: VERSION, publicidad, fecha, persistida };
  oyentes.forEach((fn) => fn());
  return cache;
}

/** Para useSyncExternalStore. */
export function subscribe(fn: () => void): () => void {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}

/** Reabre el panel «Configurar cookies» (desde el pie). */
export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_ABRIR));
}

/** Escucha la petición de reabrir el panel. Devuelve la función para dejar de escuchar. */
export function onOpenCookieSettings(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENTO_ABRIR, fn);
  return () => window.removeEventListener(EVENTO_ABRIR, fn);
}

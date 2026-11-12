// Meta Pixel con consentimiento previo (T-012, DEC-009 y DEC-010).
// Aprobado por Dirección: no sustituir por el procedimiento de cookies de Lovable sin su aprobación.
//
// Única puerta al píxel. Contacta con Meta SOLO si se cumplen las cuatro condiciones:
//   1) publicidad aceptada y guardada en el navegador,
//   2) META_PIXEL_ID no es null,
//   3) la web está en un dominio de producción,
//   4) la ruta no está excluida.
// Fuera de producción (vista previa, localhost) o con el ID vacío, si hay consentimiento,
// solo escribe en la consola lo que habría enviado. Sin consentimiento no hace nada.
// Nunca se envían datos personales: ni nombre, ni email, ni teléfono, ni dirección,
// ni número de pedido. Sin Advanced Matching y sin Conversions API.

import { getConsent } from "@/lib/consent";

// Se rellena en la puesta en producción (DEC-009). Con null, el píxel no se carga NUNCA, ni en producción.
export const META_PIXEL_ID: string | null = null;
const HOSTS_PRODUCCION = ["yollevolatarta.com", "www.yollevolatarta.com"];
const RUTAS_SIN_PIXEL = ["/web/cancelar"]; // futura página de cancelación: nunca píxel

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let cargado = false;

function rutaExcluida(): boolean {
  const path = window.location.pathname;
  return RUTAS_SIN_PIXEL.some((r) => path === r || path.startsWith(`${r}/`));
}

function publicidadAceptada(): boolean {
  const c = getConsent();
  return !!c && c.persistida && c.publicidad;
}

export function puedeContactarMeta(): boolean {
  if (typeof window === "undefined") return false;
  return (
    publicidadAceptada() &&
    META_PIXEL_ID !== null &&
    HOSTS_PRODUCCION.includes(window.location.hostname) &&
    !rutaExcluida()
  );
}

/** Snippet estándar de Meta. Solo se llama desde cargarPixelSiProcede(). */
function inyectarScript(id: string): void {
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args);
      else n.queue.push(args);
    } as Fbq;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    window.fbq = n;
    window._fbq = n;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  }
  // Sin eventos automáticos de Meta y sin datos de usuario (sin Advanced Matching).
  window.fbq("set", "autoConfig", false, id);
  window.fbq("init", id);
}

/** Carga el píxel una sola vez, y solo si se cumplen las cuatro condiciones. */
export function cargarPixelSiProcede(): void {
  if (cargado || !puedeContactarMeta() || META_PIXEL_ID === null) return;
  inyectarScript(META_PIXEL_ID);
  cargado = true;
}

/** Envía un evento estándar. Sin consentimiento no hace nada y no guarda nada para después. */
export function track(evento: string, parametros?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!publicidadAceptada() || rutaExcluida()) return;
  if (!puedeContactarMeta()) {
    console.info("[pixel]", evento, parametros ?? {});
    return;
  }
  cargarPixelSiProcede();
  window.fbq?.("track", evento, parametros ?? {});
}

function borrarCookiesMeta(): void {
  const host = window.location.hostname;
  const dominios = ["", `; domain=${host}`, `; domain=.${host}`, "; domain=.yollevolatarta.com"];
  for (const nombre of ["_fbp", "_fbc"]) {
    for (const d of dominios) {
      document.cookie = `${nombre}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
    }
  }
}

/** Retirada del consentimiento: avisa a Meta si estaba cargado, borra sus cookies y recarga la página. */
export function revocar(): void {
  if (typeof window === "undefined") return;
  try {
    if (cargado) window.fbq?.("consent", "revoke");
  } catch {
    // sin efecto: la recarga deja la página sin el script
  }
  borrarCookiesMeta();
  window.location.reload();
}

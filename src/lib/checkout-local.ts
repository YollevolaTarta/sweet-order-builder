// Recuperación de la cesta y del checkout web (T-024).
//
// Solo sirve para reconstruir la pantalla al volver de Redsys, recargar o usar «Atrás».
// NUNCA decide si un pedido está pagado, su importe, la disponibilidad, si se puede reintentar,
// devoluciones ni cancelaciones: eso lo dice siempre el servidor (estado_pago_web, crear_pedido_web,
// iniciar_pago_redsys). Prioridad: servidor → estado local → interfaz. Si lo local contradice a la
// base, manda la base.
//
// Dos almacenes:
//   localStorage   «yllt_checkout_v1»        sin datos personales (cesta, entrega, franja, cantidad y
//                                            número interno del pedido creado). Caduca a las 24 h.
//   sessionStorage «yllt_checkout_datos_v1»  datos personales del formulario y la huella del pedido
//                                            (derivada de esos datos), solo en esta pestaña.
//                                            Caduca a las 24 h o al cerrar la pestaña.
// Nunca se guardan datos de tarjeta, campos ni firmas de Redsys, secretos ni el estado del pago.
//
// La «huella» es un SHA-256 determinista de los datos del pedido, solo para comparar en esta
// pestaña si la cesta actual es la misma con la que se creó el pedido guardado. Como se calcula
// también con los datos de contacto, vive solo en sessionStorage: al cerrar la pestaña ya no se
// reutiliza el pedido (se crea otro; el anterior, sin pagar, caduca según la M48). NO es una
// credencial ni una medida de seguridad y nunca autoriza nada: si alguien la manipula, el servidor
// sigue decidiendo (el pedido solo se puede pagar si estado_pago_web e iniciar_pago_redsys lo
// permiten, y el importe sale siempre de la base).

import type { CartItem } from "@/lib/cart";

export const CLAVE_LOCAL = "yllt_checkout_v1";
export const CLAVE_DATOS = "yllt_checkout_datos_v1";
export const TTL_MS = 24 * 60 * 60 * 1000;
const MARGEN_RELOJ_MS = 5 * 60 * 1000; // una fecha «del futuro» mayor que esto se trata como corrupta
const MAX_ITEMS = 50;

export type Origen = "configura" | "diciembre";
export type Entrega = "recoger" | "envio";
export type Paso = "cesta" | "checkout";

/** Pedido creado por el servidor. En localStorage solo va `id`; `huella` se lee de esta pestaña. */
export type PedidoLocal = { id: number; huella: string | null };
type Huella = { id: number; valor: string };

export type SeccionConfigura = {
  creado: number;
  cesta: CartItem[];
  entrega: Entrega | null;
  franja: string | null;
  paso: Paso | null;
  pedido: PedidoLocal | null;
};

export type SeccionDiciembre = {
  creado: number;
  cantidad: number | null;
  pedido: PedidoLocal | null;
};

export type EstadoLocal = {
  v: 1;
  configura: SeccionConfigura | null;
  diciembre: SeccionDiciembre | null;
};

export const CAMPOS_CLIENTE = [
  "nombre",
  "apellidos",
  "email",
  "telefono",
  "direccion",
  "codigo_postal",
  "ciudad",
] as const;
export type DatosCliente = Partial<Record<(typeof CAMPOS_CLIENTE)[number], string>>;

type EstadoDatos = {
  v: 1;
  creado: number;
  configura: DatosCliente | null;
  diciembre: DatosCliente | null;
  huellas: { configura: Huella | null; diciembre: Huella | null };
};

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

// ---------- Acceso seguro (modo privado, almacenamiento lleno o bloqueado) ----------

export function almacenLocal(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function almacenSesion(): Almacen | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function leerJson(s: Almacen | null, clave: string): unknown {
  if (!s) return null;
  try {
    const raw = s.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    borrar(s, clave); // corrupto: se descarta sin avisar
    return null;
  }
}

function escribirJson(s: Almacen | null, clave: string, valor: unknown): void {
  if (!s) return;
  try {
    s.setItem(clave, JSON.stringify(valor));
  } catch {
    // sin espacio o bloqueado: la web sigue funcionando sin recuperación
  }
}

function borrar(s: Almacen | null, clave: string): void {
  try {
    s?.removeItem(clave);
  } catch {
    // nada
  }
}

// ---------- Validación (todo lo que se lee se trata como no fiable) ----------

const esObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const esEntero = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const vigente = (creado: unknown, ahora: number): creado is number =>
  typeof creado === "number" &&
  Number.isFinite(creado) &&
  creado <= ahora + MARGEN_RELOJ_MS &&
  ahora - creado < TTL_MS;

function leerPedido(v: unknown): PedidoLocal | null {
  if (!esObj(v) || !esEntero(v["id"], 1, Number.MAX_SAFE_INTEGER)) return null;
  return { id: v["id"], huella: null }; // una huella en localStorage nunca se usa
}

function itemValido(v: unknown): v is CartItem {
  if (!esObj(v)) return false;
  return (
    typeof v["uid"] === "string" &&
    ["personalizada", "receta", "pack"].includes(v["tipo"] as string) &&
    ["lata", "shake", "abierta"].includes(v["formato"] as string) &&
    typeof v["nombre"] === "string" &&
    typeof v["formatName"] === "string" &&
    Array.isArray(v["detalle"]) &&
    typeof v["precio"] === "number" &&
    Number.isFinite(v["precio"]) &&
    typeof v["foto"] === "boolean" &&
    (v["tipo"] !== "pack" || esObj(v["pack"])) &&
    (v["tipo"] !== "receta" || esObj(v["receta"]))
  );
}

function leerConfigura(v: unknown, ahora: number): SeccionConfigura | null {
  if (!esObj(v) || !vigente(v["creado"], ahora) || !Array.isArray(v["cesta"])) return null;
  const cesta = v["cesta"].filter(itemValido).slice(0, MAX_ITEMS);
  const entrega = v["entrega"] === "recoger" || v["entrega"] === "envio" ? v["entrega"] : null;
  const franja =
    typeof v["franja"] === "string" && v["franja"].length <= 40 && !Number.isNaN(Date.parse(v["franja"]))
      ? v["franja"]
      : null;
  const paso = v["paso"] === "cesta" || v["paso"] === "checkout" ? v["paso"] : null;
  const pedido = leerPedido(v["pedido"]);
  if (cesta.length === 0 && !pedido) return null;
  return { creado: v["creado"], cesta, entrega, franja, paso, pedido };
}

function leerDiciembre(v: unknown, ahora: number): SeccionDiciembre | null {
  if (!esObj(v) || !vigente(v["creado"], ahora)) return null;
  const cantidad = esEntero(v["cantidad"], 1, 100) ? v["cantidad"] : null;
  const pedido = leerPedido(v["pedido"]);
  if (cantidad === null && !pedido) return null;
  return { creado: v["creado"], cantidad, pedido };
}

const VACIO: EstadoLocal = { v: 1, configura: null, diciembre: null };

/** Estado local ya validado. Lo caducado, de otra versión o corrupto se descarta (y se borra). */
export function leerLocal(s: Almacen | null, ahora: number): EstadoLocal {
  const raw = leerJson(s, CLAVE_LOCAL);
  if (raw === null) return VACIO;
  if (!esObj(raw) || raw["v"] !== 1) {
    borrar(s, CLAVE_LOCAL);
    return VACIO;
  }
  const estado: EstadoLocal = {
    v: 1,
    configura: leerConfigura(raw["configura"], ahora),
    diciembre: leerDiciembre(raw["diciembre"], ahora),
  };
  escribirLocal(s, estado); // reescribe sin lo descartado
  return estado;
}

function escribirLocal(s: Almacen | null, e: EstadoLocal): void {
  if (!e.configura && !e.diciembre) return borrar(s, CLAVE_LOCAL);
  // Del pedido solo se guarda el número interno (nunca la huella).
  const soloId = <T extends { pedido: PedidoLocal | null }>(x: T | null) =>
    x ? { ...x, pedido: x.pedido ? { id: x.pedido.id } : null } : null;
  escribirJson(s, CLAVE_LOCAL, { v: 1, configura: soloId(e.configura), diciembre: soloId(e.diciembre) });
}

type CambiosConfigura = Partial<Omit<SeccionConfigura, "creado">>;
type CambiosDiciembre = Partial<Omit<SeccionDiciembre, "creado">>;

export function guardarConfigura(s: Almacen | null, cambios: CambiosConfigura, ahora: number): void {
  const e = leerLocal(s, ahora);
  const previa: SeccionConfigura =
    e.configura ?? { creado: ahora, cesta: [], entrega: null, franja: null, paso: null, pedido: null };
  const nueva: SeccionConfigura = { ...previa, ...cambios };
  // Sin cesta ni pedido no hay nada que recuperar.
  escribirLocal(s, { ...e, configura: nueva.cesta.length === 0 && !nueva.pedido ? null : nueva });
}

export function guardarDiciembre(s: Almacen | null, cambios: CambiosDiciembre, ahora: number): void {
  const e = leerLocal(s, ahora);
  const previa: SeccionDiciembre = e.diciembre ?? { creado: ahora, cantidad: null, pedido: null };
  const nueva: SeccionDiciembre = { ...previa, ...cambios };
  escribirLocal(s, { ...e, diciembre: nueva.cantidad === null && !nueva.pedido ? null : nueva });
}

/** Rompe el vínculo con el pedido guardado y conserva la cesta. */
export function olvidarPedido(s: Almacen | null, origen: Origen, ahora: number): void {
  if (origen === "configura") guardarConfigura(s, { pedido: null }, ahora);
  else guardarDiciembre(s, { pedido: null }, ahora);
}

/** Borra todo lo de un origen (cesta, entrega, franja, cantidad y pedido). */
export function borrarSeccion(s: Almacen | null, origen: Origen, ahora: number): void {
  const e = leerLocal(s, ahora);
  escribirLocal(s, { ...e, [origen]: null });
}

/** Borra la sección cuyo pedido guardado es este (pedido pagado o pedido nuevo). */
export function borrarPorPedido(s: Almacen | null, pedidoId: number, ahora: number): Origen | null {
  const e = leerLocal(s, ahora);
  const origen: Origen | null =
    e.configura?.pedido?.id === pedidoId ? "configura" : e.diciembre?.pedido?.id === pedidoId ? "diciembre" : null;
  if (origen) escribirLocal(s, { ...e, [origen]: null });
  return origen;
}

/** Rompe el vínculo con este pedido (cancelado, sin salida…) y conserva la cesta. */
export function olvidarPorPedido(s: Almacen | null, pedidoId: number, ahora: number): void {
  const e = leerLocal(s, ahora);
  if (e.configura?.pedido?.id === pedidoId) guardarConfigura(s, { pedido: null }, ahora);
  if (e.diciembre?.pedido?.id === pedidoId) guardarDiciembre(s, { pedido: null }, ahora);
}

// ---------- Datos personales (solo sessionStorage) ----------

function limpiarCliente(v: unknown): DatosCliente | null {
  if (!esObj(v)) return null;
  const d: DatosCliente = {};
  for (const k of CAMPOS_CLIENTE) {
    const x = v[k];
    if (typeof x === "string" && x.length > 0 && x.length <= 254) d[k] = x;
  }
  return Object.keys(d).length ? d : null;
}

function leerHuellaRaw(v: unknown): Huella | null {
  if (!esObj(v) || !esEntero(v["id"], 1, Number.MAX_SAFE_INTEGER)) return null;
  const h = v["valor"];
  return typeof h === "string" && /^[0-9a-f]{64}$/.test(h) ? { id: v["id"], valor: h } : null;
}

function leerEstadoDatos(s: Almacen | null, ahora: number): EstadoDatos | null {
  const raw = leerJson(s, CLAVE_DATOS);
  if (raw === null) return null;
  if (!esObj(raw) || raw["v"] !== 1 || !vigente(raw["creado"], ahora)) {
    borrar(s, CLAVE_DATOS);
    return null;
  }
  const h = esObj(raw["huellas"]) ? raw["huellas"] : {};
  return {
    v: 1,
    creado: raw["creado"] as number,
    configura: limpiarCliente(raw["configura"]),
    diciembre: limpiarCliente(raw["diciembre"]),
    huellas: { configura: leerHuellaRaw(h["configura"]), diciembre: leerHuellaRaw(h["diciembre"]) },
  };
}

function escribirDatos(s: Almacen | null, e: EstadoDatos): void {
  const vacio = !e.configura && !e.diciembre && !e.huellas.configura && !e.huellas.diciembre;
  if (vacio) borrar(s, CLAVE_DATOS);
  else escribirJson(s, CLAVE_DATOS, e);
}

const datosNuevos = (ahora: number): EstadoDatos => ({
  v: 1,
  creado: ahora,
  configura: null,
  diciembre: null,
  huellas: { configura: null, diciembre: null },
});

/** Huella del pedido creado en esta pestaña (solo sessionStorage). */
export function guardarHuella(s: Almacen | null, origen: Origen, h: Huella | null, ahora: number): void {
  const e = leerEstadoDatos(s, ahora) ?? datosNuevos(ahora);
  escribirDatos(s, { ...e, huellas: { ...e.huellas, [origen]: h } });
}

/** Huella guardada en esta pestaña para ESTE pedido; null si no hay o es de otro pedido. */
export function leerHuella(s: Almacen | null, origen: Origen, pedidoId: number, ahora: number): string | null {
  const h = leerEstadoDatos(s, ahora)?.huellas[origen];
  return h && h.id === pedidoId ? h.valor : null;
}

export function leerDatos(s: Almacen | null, origen: Origen, ahora: number): DatosCliente | null {
  return leerEstadoDatos(s, ahora)?.[origen] ?? null;
}

export function guardarDatos(s: Almacen | null, origen: Origen, datos: DatosCliente, ahora: number): void {
  const e = leerEstadoDatos(s, ahora) ?? datosNuevos(ahora);
  escribirDatos(s, { ...e, [origen]: limpiarCliente(datos) });
}

/** Borra de esta pestaña los datos personales y la huella de un origen. */
export function borrarDatos(s: Almacen | null, origen: Origen, ahora: number): void {
  const e = leerEstadoDatos(s, ahora);
  if (e) escribirDatos(s, { ...e, [origen]: null, huellas: { ...e.huellas, [origen]: null } });
}

// ---------- Huella (comparación local, no seguridad) ----------

/** SHA-256 en hex de la firma del pedido. null si el navegador no puede calcularlo: entonces nunca se reutiliza. */
export async function huellaDe(firma: string): Promise<string | null> {
  try {
    const sutil = globalThis.crypto?.subtle;
    if (!sutil) return null;
    const buf = await sutil.digest("SHA-256", new TextEncoder().encode(firma));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// ---------- Decisiones (solo con lo que dice el servidor) ----------

/** Lo mínimo de estado_pago_web que hace falta. Nunca se guarda en el navegador. */
export type EstadoServidor =
  | {
      ok: true;
      pago: string;
      ultimo_intento: string | null;
      puede_reintentar: boolean;
      devolucion: unknown | null;
    }
  | { ok: false; error: string };

export type DecisionPago =
  | { accion: "crear" } // no hay pedido guardado utilizable: crear uno con crear_pedido_web
  | { accion: "olvidar_y_crear" } // el guardado ya no sirve o la cesta cambió: soltar el vínculo y crear
  | { accion: "reutilizar"; pedidoId: number } // mismo pedido pendiente: solo un intento nuevo (iniciar_pago_redsys)
  | { accion: "ir_a_pago"; pedidoId: number } // pagado o en revisión: no crear ni pagar nada
  | { accion: "reintentar_mas_tarde" }; // sin respuesta del servidor: no crear nada (evita duplicados)

/** Al pulsar «Pagar ahora» con un pedido guardado. Siempre después de consultar estado_pago_web. */
export function decidirAlPagar(
  guardado: PedidoLocal | null,
  huellaActual: string | null,
  estado: EstadoServidor | null,
): DecisionPago {
  if (!guardado) return { accion: "crear" };
  if (!estado) return { accion: "reintentar_mas_tarde" };
  if (!estado.ok) {
    return estado.error === "pedido_no_encontrado" ? { accion: "olvidar_y_crear" } : { accion: "reintentar_mas_tarde" };
  }
  if (estado.pago === "pagado") return { accion: "ir_a_pago", pedidoId: guardado.id };
  if (estado.ultimo_intento === "incidencia" && estado.devolucion === null) {
    // Redsys pudo cobrar y se revisa a mano: no crear otro pedido que podría cobrarse dos veces.
    return { accion: "ir_a_pago", pedidoId: guardado.id };
  }
  const reutilizable = estado.pago === "pendiente" && estado.puede_reintentar && estado.devolucion === null;
  if (!reutilizable) return { accion: "olvidar_y_crear" };
  const misma = !!guardado.huella && !!huellaActual && guardado.huella === huellaActual;
  return misma ? { accion: "reutilizar", pedidoId: guardado.id } : { accion: "olvidar_y_crear" };
}

/** Respuesta de estado_pago_web tal como la da consultarEstadoPago; un error de red cuenta como «sin respuesta». */
export const estadoDeRespuesta = (r: { ok: boolean; error?: string }): EstadoServidor | null =>
  r.ok || r.error !== "red" ? (r as EstadoServidor) : null;

type RespuestaCrear = { ok: boolean; pedido_id?: number; pago?: string | null };

export type DepsPago<R extends RespuestaCrear> = {
  local: Almacen | null;
  sesion: Almacen | null;
  ahora: () => number;
  /** estado_pago_web(pedido, email). */
  consultar: (pedidoId: number, email: string) => Promise<{ ok: boolean; error?: string }>;
  /** crear_pedido_web(datos, true). */
  crear: () => Promise<R>;
};

export type ResultadoPreparar<R> =
  | { tipo: "pagar"; pedidoId: number } // llevar a Redsys con este pedido (nuevo o reutilizado)
  | { tipo: "ir_a_pago"; pedidoId: number } // pagado o en revisión: no crear ni pagar
  | { tipo: "sin_respuesta" } // no se ha podido consultar el pedido guardado: no se crea nada
  | { tipo: "respuesta_crear"; respuesta: R }; // crear_pedido_web respondió sin pedido pendiente (error o simulado)

/**
 * «Pagar ahora» (T-024). Orden obligatorio: servidor → estado local → interfaz.
 *  1. Si hay pedido guardado, se consulta SIEMPRE estado_pago_web antes de crear otro.
 *  2. Mismo pedido pendiente y misma huella → se reutiliza (solo un intento nuevo, con iniciar_pago_redsys).
 *  3. Pagado o en revisión → no se crea ni se paga nada.
 *  4. Si no sirve → se suelta el vínculo (la cesta se conserva) y se crea uno nuevo.
 *  5. El pedido se guarda solo después de que crear_pedido_web confirme que lo ha creado.
 */
export async function prepararPago<R extends RespuestaCrear>(
  origen: Origen,
  firma: string,
  email: string,
  deps: DepsPago<R>,
): Promise<ResultadoPreparar<R>> {
  const huella = await huellaDe(firma);
  const e = leerLocal(deps.local, deps.ahora());
  const enLocal = (origen === "configura" ? e.configura?.pedido : e.diciembre?.pedido) ?? null;
  const guardado = enLocal ? { id: enLocal.id, huella: leerHuella(deps.sesion, origen, enLocal.id, deps.ahora()) } : null;
  const estado = guardado ? estadoDeRespuesta(await deps.consultar(guardado.id, email)) : null;
  const d = decidirAlPagar(guardado, huella, estado);
  switch (d.accion) {
    case "reintentar_mas_tarde":
      return { tipo: "sin_respuesta" };
    case "ir_a_pago":
      return { tipo: "ir_a_pago", pedidoId: d.pedidoId };
    case "reutilizar":
      return { tipo: "pagar", pedidoId: d.pedidoId };
    case "olvidar_y_crear":
      olvidarPedido(deps.local, origen, deps.ahora());
      break;
    case "crear":
      break;
  }
  const r = await deps.crear();
  if (r.ok && r.pago === "pendiente" && typeof r.pedido_id === "number") {
    const pedido: PedidoLocal = { id: r.pedido_id, huella: null };
    if (origen === "configura") guardarConfigura(deps.local, { pedido }, deps.ahora());
    else guardarDiciembre(deps.local, { pedido }, deps.ahora());
    guardarHuella(deps.sesion, origen, huella ? { id: r.pedido_id, valor: huella } : null, deps.ahora());
    return { tipo: "pagar", pedidoId: r.pedido_id };
  }
  return { tipo: "respuesta_crear", respuesta: r };
}

export type DecisionCarga = "ir_a_pago" | "conservar" | "olvidar" | "sin_comprobar";

/** Al reconstruir la pantalla con un pedido guardado. Sin email en la pestaña no se puede consultar. */
export function decidirAlCargar(estado: EstadoServidor | null): DecisionCarga {
  if (!estado) return "sin_comprobar";
  if (!estado.ok) return estado.error === "pedido_no_encontrado" ? "olvidar" : "sin_comprobar";
  if (estado.pago === "pagado") return "ir_a_pago";
  if (estado.ultimo_intento === "incidencia" && estado.devolucion === null) return "ir_a_pago";
  return estado.pago === "pendiente" && estado.puede_reintentar && estado.devolucion === null ? "conservar" : "olvidar";
}

import { supabaseYLLT } from "@/lib/supabase-yllt";
import type { CartItem } from "@/lib/cart";

// Checkout web con autoridad del servidor: el navegador nunca envía precios.

export type ConfigWeb = {
  condiciones_version: string;
  texto_casilla_condiciones: string;
  comercial_texto_version: string;
  texto_casilla_comercial: string;
  envio_importe: number;
  precio_base_lata: number;
  precio_base_shake: number;
  pago_web_modo: string;
};

export type Presupuesto = {
  subtotal: number;
  envio: number;
  descuento: number;
  total: number;
  unidades: number;
  fecha_envio: string | null;
  plazo_cancelacion: string | null;
  puede_cancelar: boolean;
  pago_simulado: boolean;
  campana?: string;
  packs?: number;
  disponibles?: number;
};

export type ResultadoPedido = Presupuesto & {
  pedido_id: number;
  numero: string | null;
  pago: string | null;
  franja_recogida: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
export type RespuestaError = { ok: false; error: string } & Raw;

export type DatosPedidoWeb = {
  store_id: string;
  entrega: "recoger" | "envio";
  franja?: string;
  items: Record<string, unknown>[];
  cliente: Record<string, string>;
  acepta_condiciones: boolean;
  condiciones_version?: string;
  acepta_comercial: boolean;
  total_esperado?: number;
  fecha_envio_esperada?: string;
};

export function itemsParaServidor(cart: CartItem[]): Record<string, unknown>[] {
  return cart.map((i) => {
    const base: Raw =
      i.tipo === "pack"
        ? { tipo: "pack", formato: i.formato, pack_id: i.pack?.pack_id }
        : i.tipo === "receta"
          ? { tipo: "receta", formato: i.formato, receta_id: i.receta?.receta_id }
          : { tipo: "personalizada", formato: i.formato, crema_id: i.crema_id, topping_ids: i.topping_ids ?? [] };
    if (i.formato === "shake") {
      base.liquido = i.liquido;
      base.extra_matcha = !!i.extra_matcha;
    }
    return base;
  });
}

const num = (v: unknown) => Number(v ?? 0);

function normalizar(d: Raw): Presupuesto {
  return {
    subtotal: num(d.subtotal),
    envio: num(d.envio),
    descuento: num(d.descuento),
    total: num(d.total),
    unidades: num(d.unidades),
    fecha_envio: (d.fecha_envio as string) ?? null,
    plazo_cancelacion: (d.plazo_cancelacion as string) ?? null,
    puede_cancelar: !!d.puede_cancelar,
    pago_simulado: !!d.pago_simulado,
    ...(d.campana !== undefined ? { campana: String(d.campana) } : {}),
    ...(d.packs !== undefined ? { packs: num(d.packs) } : {}),
    ...(d.disponibles !== undefined ? { disponibles: num(d.disponibles) } : {}),
  };
}

export async function cargarConfigWeb(): Promise<ConfigWeb> {
  const { data, error } = await supabaseYLLT.rpc("config_web_publica");
  if (error || !data) throw error ?? new Error("sin config");
  const d = data as Raw;
  return {
    condiciones_version: String(d.condiciones_version ?? ""),
    texto_casilla_condiciones: String(d.texto_casilla_condiciones ?? ""),
    comercial_texto_version: String(d.comercial_texto_version ?? ""),
    texto_casilla_comercial: String(d.texto_casilla_comercial ?? ""),
    envio_importe: num(d.envio_importe),
    precio_base_lata: num(d.precio_base_lata),
    precio_base_shake: num(d.precio_base_shake),
    pago_web_modo: String(d.pago_web_modo ?? ""),
  };
}

type Resp<T> = ({ ok: true } & T) | RespuestaError;

async function llamar(datos: DatosPedidoWeb, confirmar: boolean): Promise<Raw> {
  const { data, error } = await supabaseYLLT.rpc("crear_pedido_web", {
    p_datos: datos,
    p_confirmar: confirmar,
  });
  if (error || !data) return { ok: false, error: "red" };
  return data as Raw;
}

export async function pedirPresupuesto(datos: DatosPedidoWeb): Promise<Resp<Presupuesto>> {
  try {
    const d = await llamar(datos, false);
    if (d.ok !== true) return d as RespuestaError;
    return { ok: true, ...normalizar(d) };
  } catch {
    return { ok: false, error: "red" };
  }
}

export async function confirmarPedido(datos: DatosPedidoWeb): Promise<Resp<ResultadoPedido>> {
  try {
    const d = await llamar(datos, true);
    if (d.ok !== true) return d as RespuestaError;
    return {
      ok: true,
      ...normalizar(d),
      pedido_id: num(d.pedido_id),
      numero: (d.numero as string) ?? null,
      pago: (d.pago as string) ?? null,
      franja_recogida: (d.franja_recogida as string) ?? null,
    };
  } catch {
    return { ok: false, error: "red" };
  }
}

const GENERICO = "No hemos podido enviar el pedido. Inténtalo otra vez.";

export function mensajeError(r: RespuestaError): string {
  switch (r.error) {
    case "fecha_envio_actualizada":
      return `Ha pasado la hora de corte: tu pedido saldrá el ${
        r.fecha_envio ? fechaEnvioLabel(String(r.fecha_envio)) : "próximo día de envío"
      }. Revísalo y pulsa de nuevo Pagar ahora.`;
    case "precio_actualizado":
      return `El precio de tu pedido ha cambiado: ahora son ${euroTxt(num(r.total))}. Revísalo y pulsa de nuevo Pagar ahora.`;
    case "franja_completa":
      return "Esa franja se acaba de llenar. Elige otra.";
    case "franja_no_valida":
      return "Esa franja ya no está disponible. Elige otra.";
    case "producto_no_disponible":
      return "Uno de tus postres se ha agotado. Revisa tu cesta.";
    case "composicion_no_valida":
    case "formato_no_valido":
      return "Hay un postre de tu cesta que no podemos preparar así. Revisa tu cesta.";
    case "shake_solo_recogida":
      return "El cake shake solo se puede recoger en tienda.";
    case "cp_no_valido":
      return "Solo enviamos a la España peninsular. Revisa el código postal.";
    case "direccion_incompleta":
      return "Completa la dirección de envío.";
    case "datos_cliente_no_validos":
      return "Revisa tus datos: nombre, apellidos, email y teléfono.";
    case "condiciones_no_aceptadas":
      return "Para continuar, acepta las Condiciones de compra.";
    case "condiciones_version_no_vigente":
      return "Las condiciones se han actualizado.";
    case "campana_agotada":
      return num(r.disponibles) > 0 ? `Solo quedan ${num(r.disponibles)} packs.` : "Se han agotado los packs.";
    case "campana_cerrada":
      return "La venta de la campaña ha terminado.";
    case "campana_no_disponible":
      return "Campaña no disponible.";
    case "cantidad_no_valida":
      return "Elige cuántos packs quieres.";
    case "campana_solo_envio":
    case "campana_no_combinable":
      return GENERICO;
    default:
      return GENERICO;
  }
}

const euroTxt = (n: number) =>
  n.toLocaleString("es-ES", { style: "currency", currency: "EUR" });

/** "YYYY-MM-DD" → "miércoles 14 de octubre", sin desfase de zona horaria. */
export function fechaEnvioLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).replace(",", "");
}

/** Timestamp ISO → "jueves 15 de octubre a las 16:00" en hora de Madrid. */
export function plazoLabel(iso: string): string {
  const dt = new Date(iso);
  const fecha = dt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  });
  const hora = dt.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  });
  return `${fecha.replace(",", "")} a las ${hora}`;
}

export type CampanaTarta = {
  orden: number; receta_id: number; nombre: string; crema: string; topping: string;
  descripcion: string;
  alergenos: { codigo: string; sigla: string; nombre: string }[];
  alergenos_completos: boolean;
};

export type Campana = {
  codigo: string; nombre: string;
  precio_pack: number; envio: number; packs_por_envio: number; total_un_pack: number;
  fecha_envio: string; plazo_cancelacion: string; venta_hasta: string;
  venta_abierta: boolean; disponibles: number; agotado: boolean; se_puede_comprar: boolean;
  alergenos_completos: boolean; alergenos_pendientes: string[];
  tartas: CampanaTarta[];
};

export async function cargarCampana(codigo: string): Promise<Campana | { ok: false; error: string }> {
  try {
    const { data, error } = await supabaseYLLT.rpc("campana_publica", { p_codigo: codigo });
    if (error || !data) return { ok: false, error: "red" };
    if (data.ok === false) return data;
    return {
      ...data,
      precio_pack: Number(data.precio_pack),
      envio: Number(data.envio),
      packs_por_envio: Number(data.packs_por_envio),
      total_un_pack: Number(data.total_un_pack),
      disponibles: Number(data.disponibles),
      tartas: (data.tartas ?? []).map((t: CampanaTarta) => ({
        ...t, orden: Number(t.orden), receta_id: Number(t.receta_id),
      })),
    };
  } catch {
    return { ok: false, error: "red" };
  }
}

// ---------- Pasarela Redsys (T-014, DEC-011) ----------
// El navegador nunca envía importes ni decide si un pedido está pagado: solo lleva al cliente a Redsys
// con los campos que firma el servidor (iniciar_pago_redsys) y luego consulta estado_pago_web.

export type OrigenPago = "configura" | "diciembre";
export type PagoGuardado = { pedido_id: number; email: string; origen: OrigenPago | null };

const CLAVE_PAGO = "yllt_pago";

/** Guarda en esta pestaña el pedido que se va a pagar (para la página de vuelta /web/pago). */
export function guardarPago(p: PagoGuardado): void {
  try {
    window.sessionStorage.setItem(CLAVE_PAGO, JSON.stringify(p));
  } catch {
    // sin sessionStorage: /web/pago pedirá el email
  }
}

/** Pedido guardado en esta pestaña, solo si es el de la URL. */
export function leerPago(pedidoId: number): PagoGuardado | null {
  try {
    const raw = window.sessionStorage.getItem(CLAVE_PAGO);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<PagoGuardado>;
    if (p.pedido_id !== pedidoId || typeof p.email !== "string" || !p.email) return null;
    const origen = p.origen === "configura" || p.origen === "diciembre" ? p.origen : null;
    return { pedido_id: pedidoId, email: p.email, origen };
  } catch {
    return null;
  }
}

export type InicioPago = {
  ok: true;
  url: string;
  Ds_SignatureVersion: string;
  Ds_MerchantParameters: string;
  Ds_Signature: string;
};

// Solo se envía el formulario a Redsys (pruebas o real).
const URL_REDSYS = /^https:\/\/sis(-t)?\.redsys\.es(:25443)?\/sis\/realizarPago$/;

/** Pide al servidor los campos firmados para pagar un pedido ya creado. Nunca envía importes. */
export async function iniciarPagoRedsys(
  pedido_id: number,
  email: string,
): Promise<InicioPago | RespuestaError> {
  try {
    const { data, error } = await supabaseYLLT.functions.invoke("iniciar_pago_redsys", {
      body: { pedido_id, email },
    });
    let d: Raw = data;
    if (error) {
      // 400/500: la respuesta trae { ok: false, error }
      const ctx = (error as { context?: unknown }).context;
      d = ctx instanceof Response ? await ctx.json().catch(() => null) : null;
    }
    if (!d || typeof d !== "object") return { ok: false, error: "red" };
    if (d.ok !== true) return { ok: false, error: String(d.error ?? "error_interno") };
    const campos = [d.Ds_SignatureVersion, d.Ds_MerchantParameters, d.Ds_Signature];
    if (
      typeof d.url !== "string" ||
      !URL_REDSYS.test(d.url) ||
      campos.some((c) => typeof c !== "string" || !c)
    ) {
      return { ok: false, error: "error_interno" };
    }
    return {
      ok: true,
      url: d.url,
      Ds_SignatureVersion: d.Ds_SignatureVersion,
      Ds_MerchantParameters: d.Ds_MerchantParameters,
      Ds_Signature: d.Ds_Signature,
    };
  } catch {
    return { ok: false, error: "red" };
  }
}

/** Envía al cliente a Redsys en la misma pestaña con un formulario POST oculto. */
export function enviarARedsys(r: InicioPago): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = r.url;
  form.style.display = "none";
  for (const [name, value] of [
    ["Ds_SignatureVersion", r.Ds_SignatureVersion],
    ["Ds_MerchantParameters", r.Ds_MerchantParameters],
    ["Ds_Signature", r.Ds_Signature],
  ] as const) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

/** Guarda el pedido, pide el pago al servidor y lleva a Redsys. Devuelve el error si no se puede. */
export async function irAPagar(p: PagoGuardado): Promise<RespuestaError | null> {
  guardarPago(p);
  const r = await iniciarPagoRedsys(p.pedido_id, p.email);
  if (!r.ok) return r;
  enviarARedsys(r);
  return null;
}

/** Errores de iniciar_pago_redsys tras los que hay que crear otro pedido (el actual ya no sirve). */
export const ERRORES_PEDIDO_NUEVO = [
  "pedido_no_encontrado",
  "pedido_no_valido",
  "demasiados_intentos",
  "campana_cerrada",
  "campana_agotada",
  "franja_no_valida",
  "franja_completa",
  "fecha_envio_actualizada",
];

export function mensajePago(r: RespuestaError): string {
  switch (r.error) {
    case "campana_agotada":
      return "Se han agotado los packs mientras pagabas.";
    case "campana_cerrada":
      return "La venta de la campaña ha terminado.";
    case "franja_completa":
      return "Tu franja se ha llenado mientras pagabas. Elige otra.";
    case "franja_no_valida":
      return "Tu franja ya no está disponible. Elige otra.";
    case "fecha_envio_actualizada":
      return "Ha pasado la hora de corte del envío. Revisa el nuevo día de salida y pulsa de nuevo Pagar ahora.";
    case "pedido_ya_pagado":
      return "Este pedido ya está pagado.";
    case "demasiados_intentos":
      return "Has hecho demasiados intentos de pago con este pedido. Vuelve a hacer el pedido.";
    case "pedido_no_encontrado":
    case "pedido_no_valido":
      return "No hemos podido abrir el pago de este pedido. Vuelve a hacer el pedido.";
    default:
      return "No hemos podido abrir la página de pago. Inténtalo otra vez.";
  }
}

export type EstadoPago = {
  ok: true;
  pago: string;
  numero: string | null;
  total: number;
  ultimo_intento: string | null;
  puede_reintentar: boolean;
};

/** Estado real del pago, según el servidor. Única forma de saber si un pedido está pagado. */
export async function consultarEstadoPago(
  pedido_id: number,
  email: string,
): Promise<EstadoPago | RespuestaError> {
  try {
    const { data, error } = await supabaseYLLT.rpc("estado_pago_web", {
      p_pedido_id: pedido_id,
      p_email: email,
    });
    if (error || !data) return { ok: false, error: "red" };
    const d = data as Raw;
    if (d.ok !== true) return { ok: false, error: String(d.error ?? "pedido_no_encontrado") };
    return {
      ok: true,
      pago: String(d.pago ?? ""),
      numero: (d.numero as string) ?? null,
      total: num(d.total),
      ultimo_intento: (d.ultimo_intento as string) ?? null,
      puede_reintentar: !!d.puede_reintentar,
    };
  } catch {
    return { ok: false, error: "red" };
  }
}

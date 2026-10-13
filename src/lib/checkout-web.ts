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
  });
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
  return `${fecha} a las ${hora}`;
}

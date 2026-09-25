import { packRecetas } from "@/components/configurator-parts";
import type { Formato, Pack, Receta } from "@/lib/supabase-yllt";

// Un pedido puede llevar varios postres: cada CartItem es un postre de la cesta
// y puede generar una o varias líneas en `lineas_pedido` (los packs, una por receta).
export type CartItem = {
  uid: string;
  tipo: "personalizada" | "receta" | "pack";
  formato: Formato;
  formatName: string;
  nombre: string;
  detalle: string[];
  precio: number;
  foto: boolean;
  crema?: string;
  toppings?: string[];
  receta?: Receta;
  pack?: Pack;
  liquido?: Liquido | null;
  extra_matcha?: boolean;
};

// Líquido del cake shake. El matcha va incluido, no cambia el precio.
export type Liquido = "leche" | "vegetal";
export type OpcionLiquido = { id: string; label: string; liquido: Liquido; extra_matcha: boolean };
export const OPCIONES_LIQUIDO: OpcionLiquido[] = [
  { id: "leche", label: "Leche", liquido: "leche", extra_matcha: false },
  { id: "vegetal", label: "Bebida vegetal", liquido: "vegetal", extra_matcha: false },
  { id: "matcha-leche", label: "Matcha con leche", liquido: "leche", extra_matcha: true },
  { id: "matcha-vegetal", label: "Matcha con bebida vegetal", liquido: "vegetal", extra_matcha: true },
];
export const opcionLiquido = (id: string | null) => OPCIONES_LIQUIDO.find((o) => o.id === id) ?? null;
export const liquidoLabel = (item: Pick<CartItem, "formato" | "liquido" | "extra_matcha">) => {
  if (item.formato !== "shake" || !item.liquido) return null;
  const base = item.liquido === "leche" ? "leche" : "bebida vegetal";
  return item.extra_matcha ? `Matcha con ${base}` : `Con ${base}`;
};
/** Aplica la opción de líquido a un item (solo shakes). */
export const conLiquido = (item: CartItem, opcion: OpcionLiquido | null): CartItem =>
  item.formato === "shake" && opcion
    ? { ...item, liquido: opcion.liquido, extra_matcha: opcion.extra_matcha }
    : { ...item, liquido: null, extra_matcha: false };

const liquidoCols = (item: CartItem) =>
  item.formato === "shake" && item.liquido
    ? { liquido: item.liquido, extra_matcha: !!item.extra_matcha }
    : { liquido: null, extra_matcha: false };

export const cartTotal = (cart: CartItem[]) => cart.reduce((s, i) => s + i.precio, 0);

export const unidadesDeItem = (item: CartItem) =>
  item.tipo === "pack" && item.pack ? item.pack.tamano || packRecetas(item.pack).length || 1 : 1;

export const cartUnidades = (cart: CartItem[]) =>
  cart.reduce((s, i) => s + unidadesDeItem(i), 0);

export const cartTieneShake = (cart: CartItem[]) => cart.some((i) => i.formato === "shake");

export function lineasDeItem(item: CartItem, pedidoId: number): Record<string, unknown>[] {
  if (item.tipo === "pack" && item.pack) {
    const grupo = crypto.randomUUID();
    const items = packRecetas(item.pack);
    const unit = Number((item.precio / (item.pack.tamano || items.length || 1)).toFixed(2));
    return items.map((r) => ({
      pedido_id: pedidoId,
      tipo: "pack",
      formato: item.formato,
      pack_id: item.pack!.pack_id,
      pack_grupo: grupo,
      receta_id: r.receta_id,
      receta: r.nombre,
      crema: r.crema,
      topping_1: r.topping_1,
      topping_2: r.topping_2,
      foto: item.foto,
      precio: unit,
      ...liquidoCols(item),
    }));
  }
  if (item.tipo === "receta" && item.receta) {
    const r = item.receta;
    return [
      {
        pedido_id: pedidoId,
        tipo: "receta",
        formato: item.formato,
        receta_id: r.receta_id,
        receta: r.nombre,
        crema: r.crema,
        topping_1: r.topping_1,
        topping_2: r.topping_2,
        foto: item.foto,
        precio: Number(item.precio.toFixed(2)),
        ...liquidoCols(item),
      },
    ];
  }
  return [
    {
      pedido_id: pedidoId,
      tipo: "personalizada",
      formato: item.formato,
      crema: item.crema ?? null,
      topping_1: item.toppings?.[0] ?? null,
      topping_2: item.toppings?.[1] ?? null,
      foto: item.foto,
      precio: Number(item.precio.toFixed(2)),
      ...liquidoCols(item),
    },
  ];
}

export const lineasDeCesta = (cart: CartItem[], pedidoId: number) =>
  cart.flatMap((i) => lineasDeItem(i, pedidoId));

// Helpers para crear items de cesta a partir del catálogo.
import { precioPorFormato } from "@/lib/supabase-yllt";
import type { Format } from "@/lib/menu";

export const itemDeReceta = (receta: Receta, format: Format, formato: Formato): CartItem => ({
  uid: crypto.randomUUID(),
  tipo: "receta",
  formato,
  formatName: `${format.name} · ${format.size}`,
  nombre: receta.nombre,
  detalle: [],
  precio: Number(precioPorFormato(receta, formato).toFixed(2)),
  foto: false,
  receta,
});

export const itemDePack = (pack: Pack, format: Format, formato: Formato): CartItem => ({
  uid: crypto.randomUUID(),
  tipo: "pack",
  formato,
  formatName: `${format.name} · ${format.size}`,
  nombre: `${pack.nombre} · ${pack.tamano} uds`,
  detalle: packRecetas(pack).map((r) => r.nombre),
  precio: Number(precioPorFormato(pack, formato).toFixed(2)),
  foto: false,
  pack,
});

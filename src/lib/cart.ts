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
};

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
      pack_id: item.pack!.id,
      pack_grupo: grupo,
      receta_id: r.id,
      receta: r.nombre,
      crema: r.crema,
      topping_1: r.topping_1,
      topping_2: r.topping_2,
      foto: item.foto,
      precio: unit,
    }));
  }
  if (item.tipo === "receta" && item.receta) {
    const r = item.receta;
    return [
      {
        pedido_id: pedidoId,
        tipo: "receta",
        formato: item.formato,
        receta_id: r.id,
        receta: r.nombre,
        crema: r.crema,
        topping_1: r.topping_1,
        topping_2: r.topping_2,
        foto: item.foto,
        precio: Number(item.precio.toFixed(2)),
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
    },
  ];
}

export const lineasDeCesta = (cart: CartItem[], pedidoId: number) =>
  cart.flatMap((i) => lineasDeItem(i, pedidoId));

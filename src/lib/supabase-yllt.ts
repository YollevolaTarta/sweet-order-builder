import { createClient } from "@supabase/supabase-js";

// Proyecto Supabase externo de Yo Llevo la Tarta
const SUPABASE_URL = "https://yseuxchiumkwbcovkowu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZXV4Y2hpdW1rd2Jjb3Zrb3d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzY1NDgsImV4cCI6MjEwMzg1MjU0OH0.lZXlL6QfHuilJ5uia92w4KSKeUdwPcn1DUQUjnHQSd0";

export type Pedido = {
  id: number;
  store_id: string;
  canal: "tablet" | "qr" | "web";
  serie: "T" | "W";
  numero_pedido: number | null;
  fecha_negocio: string;
  tipo_pedido: "en_tienda" | "recoger" | "envio";
  franja_recogida: string | null;
  estado: "pendiente" | "preparando" | "en_nevera" | "listo" | "cancelado";
  pago: "pendiente" | "pagado" | "fallido";
  metodo_pago: "maquina" | "pasarela" | "prueba" | null;
  total: number;
  created_at: string;
};

export type LineaPedido = {
  id: number;
  pedido_id: number;
  tipo: "personalizada" | "receta" | "pack";
  formato: "abierta" | "lata" | "shake";
  crema: string;
  topping_1: string | null;
  topping_2: string | null;
  receta: string | null;
  receta_id: number | null;
  pack_id: number | null;
  pack_grupo: string | null;
  foto: boolean;
  liquido: "leche" | "vegetal" | null;
  extra_matcha: boolean;
  precio: number;
  created_at: string;
};

export type Receta = {
  receta_id: number;
  numero: number;
  nombre: string;
  crema: string;
  topping_1: string | null;
  topping_2: string | null;
  temporada?: string | null;
  store_id: string;
  orden: number;
  crema_id: number | null;
  topping_1_id: number | null;
  topping_2_id: number | null;
  precio_lata: number;
  precio_abierta: number;
  precio_shake: number;
};

export type PackReceta = { orden: number; recetas: Receta | null };

export type IngredienteDisponible = {
  ingrediente_id: number;
  nombre: string;
  categoria: string;
  precio: number | null;
  orden: number;
  descripcion: string | null;
  media_url: string | null;
  alergenos: string[] | null;
  elaboracion_id: number | null;
  store_id: string;
};

export type Pack = {
  pack_id: number;
  nombre: string;
  tamano: number;
  temporada?: string | null;
  store_id: string;
  orden: number;
  precio_lata: number;
  precio_abierta: number;
  precio_shake: number;
  destacado?: boolean;
  pack_recetas: PackReceta[];
};


export type Formato = "abierta" | "lata" | "shake";

export const precioPorFormato = (
  item: { precio_abierta: number; precio_lata: number; precio_shake: number },
  formato: Formato,
) => (formato === "abierta" ? item.precio_abierta : formato === "lata" ? item.precio_lata : item.precio_shake);

export const supabaseYLLT = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Catálogo desde las vistas de disponibilidad (ya filtran lo agotado).
// Un pack se descarta si alguna de sus recetas no está disponible.
export async function fetchRecetasYPacks(storeId: string): Promise<{ recetas: Receta[]; packs: Pack[] }> {
  const [r, p, pr] = await Promise.all([
    supabaseYLLT.from("v_recetas_disponibles").select("*").eq("store_id", storeId).order("orden"),
    supabaseYLLT.from("v_packs_disponibles").select("*").eq("store_id", storeId).order("orden"),
    supabaseYLLT.from("pack_recetas").select("pack_id, receta_id, orden"),
  ]);
  const recetas = (r.data as Receta[]) ?? [];
  const byId = new Map(recetas.map((x) => [x.receta_id, x]));
  const links = (pr.data as { pack_id: number; receta_id: number; orden: number }[]) ?? [];
  const packs = ((p.data as Omit<Pack, "pack_recetas">[]) ?? [])
    .map((pack): Pack | null => {
      const own = links.filter((l) => l.pack_id === pack.pack_id);
      if (own.length === 0 || own.some((l) => !byId.has(l.receta_id))) return null;
      return { ...pack, pack_recetas: own.map((l) => ({ orden: l.orden, recetas: byId.get(l.receta_id)! })) };
    })
    .filter((x): x is Pack => x !== null);
  return { recetas, packs };
}
